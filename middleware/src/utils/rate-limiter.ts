/**
 * Rate Limiter Middleware
 * 
 * In-memory sliding-window rate limiter for Express.
 * Zero dependencies — suitable for single-process deployments.
 * 
 * Provides two pre-configured limiters:
 * - terminalLimiter: For /iclock/* device endpoints (generous — devices poll frequently)
 * - apiLimiter: For /api/* dashboard/diagnostic endpoints (stricter)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitEntry {
    /** Timestamps of requests within the current window */
    timestamps: number[];
    /** Last cleanup time */
    lastCleanup: number;
}

interface RateLimiterOptions {
    /** Time window in milliseconds */
    windowMs: number;
    /** Maximum requests allowed per window */
    maxRequests: number;
    /** Key extractor — determines how to group requests (default: by IP) */
    keyExtractor?: (req: Request) => string;
    /** Custom message when rate limited */
    message?: string;
    /** Whether to skip rate limiting (e.g. in development) */
    skip?: (req: Request) => boolean;
}

/**
 * Create a rate limiter middleware.
 */
export function createRateLimiter(options: RateLimiterOptions) {
    const {
        windowMs,
        maxRequests,
        keyExtractor = (req) => req.ip || 'unknown',
        message = 'Too many requests, please try again later.',
        skip,
    } = options;

    const store = new Map<string, RateLimitEntry>();

    // Periodic cleanup every 5 minutes to prevent memory leaks
    const CLEANUP_INTERVAL = 5 * 60 * 1000;
    setInterval(() => {
        const now = Date.now();
        const cutoff = now - windowMs;
        for (const [key, entry] of store) {
            entry.timestamps = entry.timestamps.filter(t => t > cutoff);
            if (entry.timestamps.length === 0) {
                store.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);

    return (req: Request, res: Response, next: NextFunction) => {
        // Allow skipping (e.g. health checks)
        if (skip && skip(req)) return next();

        const key = keyExtractor(req);
        const now = Date.now();
        const cutoff = now - windowMs;

        // Get or create entry
        let entry = store.get(key);
        if (!entry) {
            entry = { timestamps: [], lastCleanup: now };
            store.set(key, entry);
        }

        // Clean old timestamps from this entry
        if (now - entry.lastCleanup > 60_000) {
            entry.timestamps = entry.timestamps.filter(t => t > cutoff);
            entry.lastCleanup = now;
        }

        // Count requests in current window
        const recentRequests = entry.timestamps.filter(t => t > cutoff).length;

        if (recentRequests >= maxRequests) {
            const retryAfterMs = entry.timestamps[0] + windowMs - now;
            const retryAfterSec = Math.ceil(retryAfterMs / 1000);

            logger.warn(`[RateLimit] ${key} exceeded ${maxRequests} req/${windowMs / 1000}s on ${req.method} ${req.path}`);

            res.set('Retry-After', String(retryAfterSec));
            res.status(429).json({
                error: message,
                retryAfter: retryAfterSec,
            });
            return;
        }

        // Record this request
        entry.timestamps.push(now);

        // Add rate limit headers
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', String(maxRequests - recentRequests - 1));
        res.set('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

        next();
    };
}

// ── Pre-configured limiters ──────────────────────────────────────────────

/**
 * Terminal endpoint limiter (/iclock/*)
 * 
 * Generous limits — ZKTeco devices poll every 10-30 seconds.
 * Keyed by serial number (from query param SN) to rate-limit per device.
 * 
 * 120 requests per minute per device (2/sec) — well above normal polling.
 */
export const terminalLimiter = createRateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 120,
    keyExtractor: (req) => {
        const sn = req.query.SN;
        return sn ? `terminal:${String(sn).trim()}` : `ip:${req.ip || 'unknown'}`;
    },
    message: 'Terminal rate limit exceeded. Device is polling too fast.',
});

/**
 * API endpoint limiter (/api/*)
 * 
 * Stricter limits for dashboard and diagnostic endpoints.
 * Keyed by IP address.
 * 
 * 60 requests per minute per IP.
 */
export const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 60,
    message: 'API rate limit exceeded. Please slow down.',
});

/**
 * Diagnostic endpoint limiter
 * 
 * Very strict — these are debug tools, not production APIs.
 * 10 requests per minute per IP.
 */
export const diagnosticLimiter = createRateLimiter({
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 10,
    message: 'Diagnostic rate limit exceeded. These endpoints are for debugging only.',
});
