import type { Metrics } from "../types";

const SSE_DATA_PREFIX = "data:";
const SSE_DATA_PREFIX_LEN = SSE_DATA_PREFIX.length;

function buildCompletionMetrics(startTime: number, tokenCount: number): Metrics {
  return {
    timeToFirstToken: null,
    totalTime: performance.now() - startTime,
    tokenCount,
  };
}

/** Parse one SSE line. Returns true if [DONE] was seen. */
function parseSseLine(
  line: string,
  callbacks: { onTTFB: (ms: number) => void; onToken: (token: string) => void },
  refs: { firstToken: boolean; tokenCount: number },
  startTime: number,
): boolean {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith(SSE_DATA_PREFIX)) return false;

  const payload = trimmed.slice(SSE_DATA_PREFIX_LEN).trim();
  if (payload === "[DONE]") return true;

  try {
    const parsed = JSON.parse(payload);
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) {
      if (refs.firstToken) {
        refs.firstToken = false;
        callbacks.onTTFB(performance.now() - startTime);
      }
      refs.tokenCount++;
      callbacks.onToken(content);
    }
  } catch {
    // Skip malformed chunks
  }

  return false;
}

/**
 * Parse an OpenAI SSE stream from a ReadableStream.
 * Calls onToken for each text delta, onTTFB when the first token arrives,
 * and onComplete when done.
 * Supports cancellation via AbortSignal.
 */
export async function streamChat(
  message: string,
  provider: "openai" | "openrouter",
  signal: AbortSignal,
  callbacks: {
    onToken: (token: string) => void;
    onTTFB: (ms: number) => void;
    onComplete: (metrics: Metrics) => void;
    onError: (err: Error) => void;
  },
): Promise<void> {
  const startTime = performance.now();
  const refs = { firstToken: true, tokenCount: 0 };

  const { onToken, onComplete, onError, onTTFB } = callbacks;

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, provider }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error ?? `HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines — OpenAI sends "data: <json>\n\n"
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (parseSseLine(line, { onTTFB, onToken }, refs, startTime)) {
          onComplete(buildCompletionMetrics(startTime, refs.tokenCount));
          return;
        }
      }
    }

    // Stream ended without [DONE] — interrupted or truncated
    onComplete(buildCompletionMetrics(startTime, refs.tokenCount));
  } catch (err: any) {
    if (err.name === "AbortError") {
      onComplete(buildCompletionMetrics(startTime, refs.tokenCount));
    } else {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

/** Non-streaming fetch */
export async function fetchChat(
  message: string,
  provider: "openai" | "openrouter",
): Promise<{ content: string; totalTime: number }> {
  const startTime = performance.now();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, provider }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  const totalTime = performance.now() - startTime;
  return { content: data.content, totalTime };
}
