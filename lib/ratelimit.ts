// In-memory sliding-window rate limiter
// Works per serverless instance; sufficient for our scale.
// Swap for @upstash/ratelimit if multi-instance coordination needed.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number; // window in milliseconds
  max: number;      // max requests in window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (existing.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: config.max - existing.count, resetAt: existing.resetAt };
}

// Pre-configured limiters
export const authLimiter: RateLimitConfig = { windowMs: 60_000, max: 5 };   // 5/min
export const uploadLimiter: RateLimitConfig = { windowMs: 60_000, max: 10 }; // 10/min
export const searchLimiter: RateLimitConfig = { windowMs: 60_000, max: 30 }; // 30/min

export function getClientIP(req: Request): string {
  const headers = req instanceof Request ? req.headers : (req as unknown as { headers: Headers }).headers;
  return (
    headers.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get?.('x-real-ip') ||
    'unknown'
  );
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
}
