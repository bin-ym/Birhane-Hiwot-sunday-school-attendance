// src/lib/redis.ts
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Lazily-created Upstash Redis client.
 * Returns `null` when UPSTASH_REDIS_REST_URL/TOKEN are not configured,
 * so distributed locks silently degrade to no-ops in local dev / previews.
 */
export function getRedis(): Redis | null {
  if (!url || !token) return null;
  return new Redis({ url, token });
}
