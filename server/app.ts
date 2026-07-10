import { Hono } from "hono";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";

const MODEL = "gpt-4o-mini";
const OPENAI_BASE = "https://api.openai.com/v1/chat/completions";

const app = new Hono();

app.use("/*", cors());

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set on server");
  }
  return apiKey;
}

async function fetchOpenAI(apiKey: string, message: string, streamMode: boolean) {
  return fetch(OPENAI_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: message }],
      stream: streamMode,
    }),
  });
}

// ----- Streaming endpoint -----
app.post("/api/chat/stream", async (c) => {
  const { message } = await c.req.json<{ message: string }>();

  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch {
    return c.json({ error: "OPENAI_API_KEY not set on server" }, 500);
  }

  const response = await fetchOpenAI(apiKey, message, true);

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
  const { message } = await c.req.json<{ message: string }>();

  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch {
    return c.json({ error: "OPENAI_API_KEY not set on server" }, 500);
  }

  const response = await fetchOpenAI(apiKey, message, false);

  const data = await response.json();
  if (!response.ok) return c.json({ error: data }, response.status as any);

  return c.json({ content: data.choices[0]?.message?.content ?? "" });
});

// ----- Health check -----
app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
