/**
 * Security Utilities
 * Input validation, sanitization, and security helpers
 */

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate UUID format
 */
export function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}

/**
 * Validate employee ID format (alphanumeric, 3-20 chars)
 */
export function isValidEmployeeId(empId: string): boolean {
    const empIdRegex = /^[A-Za-z0-9-]{3,20}$/
    return empIdRegex.test(empId)
}

/**
 * Validate phone number format (Ghana format +233XXXXXXXXX or 0XXXXXXXXX)
 */
export function isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+233|0)[2-5]\d{8}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

// ============================================================================
// Input Sanitization
// ============================================================================

/**
 * Sanitize string input - removes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return ''

    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .slice(0, 1000) // Limit length
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
    return sanitizeString(query)
        .replace(/[%_]/g, '') // Remove SQL wildcards
        .slice(0, 100)
}

/**
 * Sanitize name input
 */
export function sanitizeName(name: string): string {
    return sanitizeString(name)
        .replace(/[^a-zA-Z\s'-]/g, '') // Only allow letters, spaces, hyphens, apostrophes
        .slice(0, 100)
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input)
    if (isNaN(num)) return null
    if (min !== undefined && num < min) return min
    if (max !== undefined && num > max) return max
    return num
}

// ============================================================================
// Security Helpers
// ============================================================================

/**
 * Create a safe object from user input by only allowing specified keys
 */
export function pickSafeFields<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    allowedKeys: K[]
): Pick<T, K> {
    const result = {} as Pick<T, K>

    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key]
        }
    }

    return result
}

/**
 * Mask sensitive data for logging
 */
export function maskEmail(email: string): string {
    if (!email.includes('@')) return '***'
    const [local, domain] = email.split('@')
    const maskedLocal = local.length > 2
        ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
        : '*'.repeat(local.length)
    return `${maskedLocal}@${domain}`
}

/**
 * Mask phone number for display
 */
export function maskPhone(phone: string): string {
    if (phone.length < 6) return '***'
    return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`
}

/**
 * Rate limiting helper - tracks attempts within a time window
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; resetAt: number }>()

    return {
        isAllowed(key: string): boolean {
            const now = Date.now()
            const entry = attempts.get(key)

            if (!entry || now > entry.resetAt) {
                attempts.set(key, { count: 1, resetAt: now + windowMs })
                return true
            }

            if (entry.count >= maxAttempts) {
                return false
            }

            entry.count++
            return true
        },

        reset(key: string): void {
            attempts.delete(key)
        },

        getRemainingAttempts(key: string): number {
            const entry = attempts.get(key)
            if (!entry || Date.now() > entry.resetAt) return maxAttempts
            return Math.max(0, maxAttempts - entry.count)
        },
    }
}

// ============================================================================
// Constants for Validation
// ============================================================================

export const VALIDATION_LIMITS = {
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 254,
    MAX_SEARCH_QUERY_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
} as const

export const ALLOWED_EMPLOYEE_FIELDS = [
    'name',
    'email',
    'department_id',
    'agency_id',
    'job_title',
    'employment_type',
    'date_join',
    'gender',
    'marital_status',
    'address',
    'emergency_contact',
    'education',
] as const
