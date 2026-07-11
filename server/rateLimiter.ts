export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(ip: string): { allowed: boolean; retryAfter?: number };
  reset(): void;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  function evictExpired(now: number): void {
    for (const [ip, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(ip);
      }
    }
  }

  return {
    check(ip: string): { allowed: boolean; retryAfter?: number } {
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now >= entry.resetAt) {
        evictExpired(now);
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }

      if (entry.count >= limit) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }

      entry.count++;
      return { allowed: true };
    },
    reset(): void {
      store.clear();
    },
  };
}
