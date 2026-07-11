import { describe, it, expect, vi } from "vitest";
import type {} from "vitest";
import { streamChat } from "./api";

describe("streamChat", () => {
  it("parses SSE chunks and emits tokens", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    } as unknown as Response);

    const tokens: string[] = [];
    const controller = new AbortController();

    await streamChat("hi", "openai", controller.signal, {
      onToken: (t) => tokens.push(t),
      onTTFB: () => {},
      onComplete: (m) => {
        expect(m.tokenCount).toBe(2);
      },
      onError: (e) => {
        throw e;
      },
    });

    expect(tokens).toEqual(["Hello", " world"]);
  });

  it("aborts before the first token and completes without error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const controller = new AbortController();
    controller.abort();

    let completed = false;
    let error: Error | null = null;

    await streamChat("hi", "openai", controller.signal, {
      onToken: () => {},
      onTTFB: () => {},
      onComplete: () => {
        completed = true;
      },
      onError: (e) => {
        error = e;
      },
    });

    expect(completed).toBe(true);
    expect(error).toBeNull();
  });
});
