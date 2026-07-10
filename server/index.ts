import { Hono } from "hono";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const app = new Hono();

app.use("/*", cors());

// ----- Streaming endpoint -----
app.post("/api/chat/stream", async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not set on server" }, 500);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      stream: true,
    }),
  });

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
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not set on server" }, 500);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
      stream: false,
    }),
  });

  const data = await response.json();
  if (!response.ok) return c.json({ error: data }, response.status as any);

  return c.json({ content: data.choices[0]?.message?.content ?? "" });
});

// ----- Health check -----
app.get("/api/health", (c) => c.json({ ok: true }));

const port = parseInt(process.env.PORT ?? "3001", 10);
console.log(`Hono server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
