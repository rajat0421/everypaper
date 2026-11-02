/**
 * Simple in-memory sliding-window rate limiter, keyed by an arbitrary string
 * (session id). Structured as its own module so it can be swapped for a
 * distributed implementation (e.g. Redis) later without touching callers.
 */
export class SlidingWindowRateLimiter {
  private readonly windowMs: number;
  private readonly maxEvents: number;
  private readonly hits = new Map<string, number[]>();

  constructor(maxEventsPerWindow: number, windowMs = 60_000) {
    this.maxEvents = maxEventsPerWindow;
    this.windowMs = windowMs;
  }

  /** Returns true if the event is allowed (and records it); false if rate-limited. */
  tryConsume(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existing = this.hits.get(key) ?? [];
    const recent = existing.filter((ts) => ts > windowStart);
    if (recent.length >= this.maxEvents) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  clear(key: string): void {
    this.hits.delete(key);
  }
}
