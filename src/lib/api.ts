import type { Metrics } from "../types";

/**
 * Parse an OpenAI SSE stream from a ReadableStream.
 * Calls onToken for each text delta, onTTFB when the first token arrives,
 * and onComplete when done.
 * Supports cancellation via AbortSignal.
 */
export async function streamChat(
  message: string,
  signal: AbortSignal,
  callbacks: {
    onToken: (token: string) => void;
    onTTFB: (ms: number) => void;
    onComplete: (metrics: Metrics) => void;
    onError: (err: Error) => void;
  },
): Promise<void> {
  const startTime = performance.now();
  let firstToken = true;
  let tokenCount = 0;

  const { onToken, onComplete, onError, onTTFB } = callbacks;

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error((errData as any).error ?? `HTTP ${response.status}`);
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
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          onComplete({
            timeToFirstToken: null,
            totalTime: performance.now() - startTime,
            tokenCount,
          });
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            if (firstToken) {
              firstToken = false;
              onTTFB(performance.now() - startTime);
            }
            tokenCount++;
            onToken(content);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Stream ended without [DONE] — interrupted or truncated
    onComplete({
      timeToFirstToken: null,
      totalTime: performance.now() - startTime,
      tokenCount,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      onComplete({
        timeToFirstToken: null,
        totalTime: performance.now() - startTime,
        tokenCount,
      });
    } else {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

/** Non-streaming fetch */
export async function fetchChat(message: string): Promise<{ content: string; totalTime: number }> {
  const startTime = performance.now();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error((errData as any).error ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  const totalTime = performance.now() - startTime;
  return { content: data.content, totalTime };
}
