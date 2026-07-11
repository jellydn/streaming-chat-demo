import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimiter.js";

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("ip1").allowed).toBe(true);
    expect(limiter.check("ip1").allowed).toBe(true);
    const result = limiter.check("ip1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("tracks different clients separately", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("ip1").allowed).toBe(true);
    expect(limiter.check("ip2").allowed).toBe(true);
    expect(limiter.check("ip1").allowed).toBe(false);
    expect(limiter.check("ip2").allowed).toBe(false);
  });

  it("resets the store", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("ip1");
    limiter.reset();
    expect(limiter.check("ip1").allowed).toBe(true);
  });
});
