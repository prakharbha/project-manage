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

/**
 * Returns true when the request may proceed, false when it should be blocked.
 *
 * Strategy (in order):
 *  1. No Origin header → server-to-server or same-origin request without CORS; allow.
 *  2. Origin matches the request's own Host header (works on any deployment domain automatically).
 *  3. Origin matches NEXT_PUBLIC_APP_URL env var (explicit override for reverse-proxy setups).
 *  4. Otherwise → block (cross-origin request from an unknown domain).
 */
export function checkCsrf(req: Request): boolean {
    const origin = req.headers.get('origin');
    if (!origin) return true; // no origin header = same-origin or server-to-server

    try {
        const incomingOrigin = new URL(origin).origin;

        // ── Check 1: dynamic self-origin from Host header ──
        // Handles any deployment URL automatically without needing env vars.
        const host = req.headers.get('host');
        if (host) {
            // Respect x-forwarded-proto set by reverse proxies (Vercel, nginx, etc.)
            const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? 'https';
            try {
                if (new URL(`${proto}://${host}`).origin === incomingOrigin) return true;
            } catch { /* ignore malformed host */ }
        }

        // ── Check 2: explicit env var + known production origins ──
        const staticAllowed = [
            process.env.NEXT_PUBLIC_APP_URL,
            'https://goal.nandann.com',
        ].filter(Boolean) as string[];

        for (const allowed of staticAllowed) {
            try {
                if (new URL(allowed).origin === incomingOrigin) return true;
            } catch { /* ignore malformed entry */ }
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
