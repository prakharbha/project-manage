/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: State is per-process. In a multi-instance deployment (e.g. multiple
 * Kubernetes pods) you should replace this with a shared Redis store
 * (e.g. @upstash/ratelimit). For a single-server or serverless deployment
 * this is effective and requires zero external dependencies.
 */

interface Window {
    count: number;
    resetAt: number;
}

const store = new Map<string, Window>();

// Prune expired entries every 10 minutes to avoid unbounded memory growth.
setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
        if (win.resetAt < now) store.delete(key);
    }
}, 10 * 60 * 1_000);

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * @param key       Unique bucket key — typically `"<endpoint>:<ip>"`
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (existing.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count++;
    return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Extract the best available client IP from common proxy headers. */
export function getClientIp(req: Request): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

/** Build a 429 Response with a Retry-After header. */
export function tooManyRequestsResponse(resetAt: number): Response {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1_000);
    return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
            },
        }
    );
}
