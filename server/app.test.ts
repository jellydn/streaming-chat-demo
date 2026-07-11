import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "./app";
import { createRateLimiter } from "./rateLimiter";

describe("server routes", () => {
  const originalEnv = process.env;
  const rateLimiter = createRateLimiter(10, 60_000);
  const app = createApp(rateLimiter);

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    rateLimiter.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });
  it("returns 500 when OpenAI key is missing", async () => {
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", provider: "openai" }),
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("OPENAI_API_KEY not set");
  });

  it("returns 500 when OpenRouter key is missing", async () => {
    const res = await app.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", provider: "openrouter" }),
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("OPENROUTER_API_KEY not set");
  });

  it("health check returns ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("denies CORS requests from untrusted origins", async () => {
    const res = await app.request("/api/health", {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("denies OPTIONS preflight from untrusted origins", async () => {
    const res = await app.request("/api/chat", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const limited = createRateLimiter(1, 60_000);
    const testApp = createApp(limited);

    const first = await testApp.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", provider: "openai" }),
    });
    expect(first.status).toBe(500);

    const second = await testApp.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", provider: "openai" }),
    });
    expect(second.status).toBe(429);
  });
});
