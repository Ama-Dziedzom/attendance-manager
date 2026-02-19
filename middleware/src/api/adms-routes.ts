/**
 * ADMS (Advanced Device Management System) Routes
 * 
 * Thin orchestrator that wires together the modular route handlers:
 * - adms-protocol.ts    → Core PUSH protocol (registry, getrequest, cdata, devicecmd)
 * - sync-routes.ts      → Employee sync endpoints (sync-to-device, reset-sync)
 * - diagnostic-routes.ts → Debug/test endpoints (queue inspect, format tests, raw commands)
 */

import { Express, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { terminalLimiter, apiLimiter, diagnosticLimiter } from '../utils/rate-limiter';
import { setupProtocolRoutes } from './adms-protocol';
import { setupSyncRoutes } from './sync-routes';
import { setupDiagnosticRoutes } from './diagnostic-routes';

export function setupAdmsRoutes(app: Express, supabase: SupabaseClient) {
    // Catch-all logger for all /iclock requests
    app.use('/iclock', (req, res, next) => {
        logger.info(`[ADMS Request] ${req.method} ${req.url}`, {
            query: req.query,
            ip: req.ip
        });
        next();
    });

    // Rate limiting per endpoint tier
    app.use('/iclock', terminalLimiter);       // 120 req/min per device
    app.use('/api/sync-to-device', apiLimiter); // 60 req/min per IP
    app.use('/api/terminals', diagnosticLimiter); // 10 req/min per IP

    // Wire up route modules
    setupProtocolRoutes(app);
    setupSyncRoutes(app);
    setupDiagnosticRoutes(app);

    logger.info('[ADMS] All routes configured (with rate limiting)');
}
