// src/lib/rateLimit.ts
// Lightweight in-memory sliding-window rate limiter.
// For production, swap to Redis-backed (Upstash) if memory limits matter.

interface Bucket {
  timestamps: number[];
}

const store = new Map<string, Bucket>();

// Cleanup old buckets every 5 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, bucket] of store) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed in the window. */
  maxRequests: number;
  /** Window size in milliseconds (default 60s). */
  windowMs?: number;
  /** Custom key prefix (defaults to the IP). */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check (and record) a request against a sliding-window rate limit.
 * Returns whether the request is allowed, remaining quota, and retry delay.
 */
export function rateLimit(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const { maxRequests, windowMs = 60_000, keyPrefix = "" } = opts;
  const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(key, bucket);
  }

  // Remove timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Helper: extract client IP from request headers.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Apply rate limit and return a 429 NextResponse if exceeded.
 * Returns null if the request is allowed.
 */
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
): Promise<Response | null> {
  const ip = getClientIp(req);
  const result = rateLimit(ip, opts);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null; // allowed
}
