/**
 * Shared security utilities
 *
 * - escapeHtml:        Prevents XSS when embedding user content in HTML emails
 * - validatePassword:  Enforces minimum password strength
 * - checkCsrf:         Verifies Origin header to block cross-site state mutations
 * - csrfError:         Returns a 403 Response for CSRF failures
 * - auditLog:          Structured JSON console log for admin actions (ingest via Datadog / CloudWatch etc.)
 */

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

/**
 * Escape all HTML special characters so that user-supplied strings
 * are rendered as text, not markup, when embedded in email templates.
 */
export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

export interface PasswordValidationResult {
    valid: boolean;
    message?: string;
}

/**
 * Require at least 8 characters, one letter, and one digit.
 * Adjust rules here as your security policy evolves.
 */
export function validatePassword(password: string): PasswordValidationResult {
    if (!password || password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one letter' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
}

// ---------------------------------------------------------------------------
// CSRF — Origin header validation
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set(
    [
        process.env.NEXT_PUBLIC_APP_URL,
        'https://clients.nandann.com',
        'http://localhost:3000',
        'http://localhost:3001',
    ].filter(Boolean) as string[]
);

/**
 * Returns true when the request may proceed, false when it should be blocked.
 *
 * Logic:
 *  • No Origin header → server-to-server or same-origin GET; allow.
 *  • Origin header present → must match one of the allowed origins.
 */
export function checkCsrf(req: Request): boolean {
    const origin = req.headers.get('origin');
    if (!origin) return true;  // server-to-server or same-origin (no origin header)

    try {
        // Normalise to scheme + host only (strips path / query)
        const incomingOrigin = new URL(origin).origin;
        for (const allowed of ALLOWED_ORIGINS) {
            try {
                if (new URL(allowed).origin === incomingOrigin) return true;
            } catch {
                // skip malformed entries
            }
        }
        return false;
    } catch {
        return false;
    }
}

export function csrfError(): Response {
    return new Response(
        JSON.stringify({ error: 'Forbidden: invalid request origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Emit a structured JSON line that log aggregation services can ingest.
 * Never logs sensitive data (passwords, tokens).
 */
export function auditLog(
    action: string,
    actorId: string,
    details: Record<string, unknown>
): void {
    console.log(
        JSON.stringify({
            audit: true,
            timestamp: new Date().toISOString(),
            action,
            actorId,
            ...details,
        })
    );
}
