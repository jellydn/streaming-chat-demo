import { Hono } from "hono";
import type { Context } from "hono";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";
import { createRateLimiter, type RateLimiter } from "./rateLimiter.js";

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_BASE = "https://api.openai.com/v1/chat/completions";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_DEFAULT_MODEL = "openrouter/free";

const DEFAULT_RATE_LIMIT = 10;
const DEFAULT_RATE_WINDOW_MS = 60_000;

/** Extract a client identifier from the request.
 * When `TRUST_PROXY=true` it uses `x-forwarded-for` for a per-IP limit.
 * Otherwise it falls back to a single shared bucket, making the limiter
 * behave as a global rate limit for the demo. Use a trusted proxy in
 * production to get real per-IP limiting.
 */
function getClientId(c: Context): string {
  if (process.env.TRUST_PROXY === "true") {
    return c.req.header("x-forwarded-for") ?? "unknown";
  }
  return "client";
}

export function createApp(
  rateLimiter: RateLimiter = createRateLimiter(DEFAULT_RATE_LIMIT, DEFAULT_RATE_WINDOW_MS),
): Hono {
  const app = new Hono();

  // Restrict CORS to trusted origins. In production, allow the deployed origin;
  // in development, allow the Vite dev server.
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  );

  app.use(
    "/*",
    cors({
      origin: (origin) => (origin && allowedOrigins.has(origin) ? origin : null),
      credentials: false,
    }),
  );

  type Provider = "openai" | "openrouter";

  interface ChatRequest {
    message: string;
    provider: Provider;
  }

  function getConfig(provider: Provider): {
    apiKey: string;
    baseUrl: string;
    model: string;
    extraHeaders: Record<string, string>;
  } {
    if (provider === "openrouter") {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY not set on server");
      }
      return {
        apiKey,
        baseUrl: OPENROUTER_BASE,
        model: process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
        extraHeaders: {
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:5173",
          "X-Title": "Streaming Chat Demo",
        },
      };
    }

    if (provider !== "openai") {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set on server");
    }
    return {
      apiKey,
      baseUrl: OPENAI_BASE,
      model: OPENAI_MODEL,
      extraHeaders: {},
    };
  }

  async function fetchAI(
    config: ReturnType<typeof getConfig>,
    message: string,
    streamMode: boolean,
    signal?: AbortSignal,
  ) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...config.extraHeaders,
    };

    return fetch(config.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: message }],
        stream: streamMode,
      }),
      signal,
    });
  }

  // ----- Streaming endpoint -----
  app.post("/api/chat/stream", async (c) => {
    const limit = rateLimiter.check(getClientId(c));
    if (!limit.allowed) {
      return c.json({ error: "Rate limit exceeded" }, 429, {
        "Retry-After": String(limit.retryAfter),
      });
    }

    const { message, provider } = await c.req.json<ChatRequest>();

    let config: ReturnType<typeof getConfig>;
    try {
      config = getConfig(provider);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }

    const response = await fetchAI(config, message, true, c.req.raw.signal);

    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: err }, 502);
    }

    return stream(c, async (s) => {
      await s.pipe(response.body!);
    });
  });

  // ----- Non-streaming endpoint -----
  app.post("/api/chat", async (c) => {
    const limit = rateLimiter.check(getClientId(c));
    if (!limit.allowed) {
      return c.json({ error: "Rate limit exceeded" }, 429, {
        "Retry-After": String(limit.retryAfter),
      });
    }

    const { message, provider } = await c.req.json<ChatRequest>();

    let config: ReturnType<typeof getConfig>;
    try {
      config = getConfig(provider);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }

    const response = await fetchAI(config, message, false, c.req.raw.signal);

    const data = await response.json();
    if (!response.ok) return c.json({ error: data }, 502);

    return c.json({ content: data.choices[0]?.message?.content ?? "" });
  });

  // ----- Health check -----
  app.get("/api/health", (c) => c.json({ ok: true }));

  return app;
}

const app = createApp();

export default app;
