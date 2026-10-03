// src/lib/distributedLock.ts
import { randomUUID } from "crypto";
import { getRedis } from "./redis";

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface LockOptions {
  /** Lock TTL in ms. The critical section should finish well within this. */
  ttlMs?: number;
  /** How long to keep retrying to acquire the lock before giving up (ms). */
  waitMs?: number;
  /** Retry interval between attempts (ms). */
  retryMs?: number;
}

/**
 * Acquire a distributed lock.
 * Returns a token that must be passed to `releaseLock`, or `null` if the lock
 * could not be acquired within `waitMs` (or Redis is not configured).
 */
export async function acquireLock(
  key: string,
  { ttlMs = 10_000, waitMs = 5_000, retryMs = 100 }: LockOptions = {},
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null; // Redis not configured → allow operation (no lock)

  const token = randomUUID();
  const deadline = Date.now() + waitMs;

  while (true) {
    // SET key token NX PX ttl — atomic acquire
    const acquired =
      (await redis.set(key, token, { nx: true, px: ttlMs })) === "OK";
    if (acquired) return token;

    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, retryMs));
  }
}

/**
 * Release a distributed lock. Only releases if `token` still owns the lock
 * (prevents releasing a lock that expired and was re-acquired by someone else).
 */
export async function releaseLock(
  key: string,
  token: string | null,
): Promise<void> {
  if (!token) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.eval(RELEASE_SCRIPT, [key], [token]);
  } catch {
    // Best-effort release — the lock TTL will expire it anyway.
  }
}

/**
 * Run `fn` while holding a distributed lock on `key`.
 *
 * - Acquires with retry up to `waitMs`, then throws LockTimeoutError if busy.
 * - If Redis is not configured, runs `fn` directly (degraded, no mutual exclusion).
 * - Always releases the lock afterwards (even if `fn` throws).
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  let token: string | null = null;
  try {
    token = await acquireLock(key, options);
  } catch (err) {
    // Redis infrastructure error (network, quota, outage): fail OPEN and run
    // without the lock rather than blocking attendance submissions entirely.
    // Mutual exclusion degrades; availability is preserved.
    console.error(`Distributed lock unavailable for "${key}", running unlocked:`, err);
    return fn();
  }
  if (token === null) {
    const redis = getRedis();
    if (!redis) return fn(); // no Redis → skip locking entirely
    throw new LockTimeoutError(
      `Timed out waiting for lock on "${key}" (Redis busy).`,
    );
  }
  try {
    return await fn();
  } finally {
    await releaseLock(key, token);
  }
}

export class LockTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockTimeoutError";
  }
}
