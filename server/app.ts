import { Hono } from "hono";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_BASE = "https://api.openai.com/v1/chat/completions";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_DEFAULT_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

const app = new Hono();

app.use("/*", cors());

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

async function fetchAI(config: ReturnType<typeof getConfig>, message: string, streamMode: boolean) {
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
  });
}

// ----- Streaming endpoint -----
app.post("/api/chat/stream", async (c) => {
  const { message, provider } = await c.req.json<ChatRequest>();

  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig(provider);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }

  const response = await fetchAI(config, message, true);

  if (!response.ok) {
    const err = await response.text();
    return c.json({ error: err }, response.status as any);
  }

  return stream(c, async (s) => {
    await s.pipe(response.body!);
  });
});

// ----- Non-streaming endpoint -----
app.post("/api/chat", async (c) => {
  const { message, provider } = await c.req.json<ChatRequest>();

  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig(provider);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }

  const response = await fetchAI(config, message, false);

  const data = await response.json();
  if (!response.ok) return c.json({ error: data }, response.status as any);

  return c.json({ content: data.choices[0]?.message?.content ?? "" });
});

// ----- Health check -----
app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
