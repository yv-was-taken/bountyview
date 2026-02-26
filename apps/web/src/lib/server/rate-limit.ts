/**
 * Simple in-memory rate limiter for auth and API endpoints.
 * Tracks requests per IP address within a sliding window.
 * Not suitable for multi-instance deployments — use Redis-backed
 * solution when scaling horizontally.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning(): void {
  if (cleanupTimer !== null) {
    return;
  }

  cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the process to exit without waiting for the timer
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 60 }
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Check whether a request from the given IP is within the rate limit.
 * Returns `{ allowed: true }` if the request can proceed, or
 * `{ allowed: false, retryAfterSeconds }` if the limit is exceeded.
 */
export function checkRateLimit(
  ip: string,
  bucket: string,
  config: RateLimitConfig
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  ensureCleanupRunning();

  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const existing = store.get(key);

  // If no entry or window has expired, start a new window
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  // Within window — increment and check
  existing.count += 1;

  if (existing.count > config.maxRequests) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}
