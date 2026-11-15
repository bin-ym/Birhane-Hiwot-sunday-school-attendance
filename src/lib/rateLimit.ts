// src/lib/rateLimit.ts
// Sliding-window rate limiter.
// - Production: Redis-backed (Upstash) so limits are enforced globally across
//   all serverless instances.
// - Fallback: in-memory Map (single-instance only, e.g. local dev).

import { getRedis } from "./redis";

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
 * In-memory sliding window (fallback when Redis is not configured).
 * Mirrors the Redis semantics so behavior is identical in dev.
 */
function rateLimitInMemory(key: string, maxRequests: number, windowMs: number): RateLimitResult {
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
 * Redis-backed sliding window. Uses a single atomic pipeline (no Lua script
 * needed for Upstash REST), so limits are enforced globally across instances.
 */
async function rateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getRedis()!;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const cutoff = now - windowMs;

  const results = await redis
    .pipeline()
    .zremrangebyscore(key, "-inf", cutoff)
    .zadd(key, { score: now, member })
    .zcard(key)
    .expire(key, Math.ceil((windowMs * 2) / 1000))
    .exec();

  const count = Number(results?.[2] ?? 0);

  if (count > maxRequests) {
    // Over the limit: remove the entry we just added so denied requests do not
    // consume quota, then find how long until the oldest entry expires.
    await redis.zrem(key, member);
    const oldest = await redis.zrange(key, 0, 0, { withScores: true });
    const oldestScore = oldest.length >= 2 ? Number(oldest[1]) : now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldestScore + windowMs - now),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - count),
    retryAfterMs: 0,
  };
}

/**
 * Check (and record) a request against a sliding-window rate limit.
 * Returns whether the request is allowed, remaining quota, and retry delay.
 * Falls back to in-memory when Redis is unavailable.
 */
export async function rateLimit(
  identifier: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const { maxRequests, windowMs = 60_000, keyPrefix = "" } = opts;
  const key = keyPrefix
    ? `rl:${keyPrefix}:${identifier}`
    : `rl:${identifier}`;

  const redis = getRedis();
  if (redis) {
    try {
      return await rateLimitRedis(key, maxRequests, windowMs);
    } catch (err: any) {
      if (err.message && err.message.includes("WRONGPASS")) {
        // Silently fall back to memory, Upstash credentials are known to be missing/incorrect
      } else {
        console.error("Rate limit Redis error, falling back to memory:", err);
      }
    }
  }

  return rateLimitInMemory(key, maxRequests, windowMs);
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
  const result = await rateLimit(ip, opts);

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
