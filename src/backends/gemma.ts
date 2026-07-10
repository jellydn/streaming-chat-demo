import type { ChatBackend, StreamCallbacks } from "./types";
import type { GemmaContextValue } from "../GemmaContext";

/**
 * Backend for Gemma running locally via WebLLM.
 *
 * The Gemma engine is loaded and managed by GemmaContext; this adapter
 * translates the ChatBackend interface into GemmaContext calls.
 *
 * stop() directly interrupts the engine. streamMessage() passes the
 * external signal through to Gemma's internal AbortController so that
 * both the Stop button and cleanup paths can cancel generation.
 */
export class GemmaBackend implements ChatBackend {
  readonly name = "gemma";

  constructor(private gemma: GemmaContextValue) {}

  get ready(): boolean {
    return this.gemma.ready;
  }

  async streamMessage(
    message: string,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    // Gemma's sendMessage expects an AbortController (not just a signal)
    // so we bridge the external signal into a local controller.
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      await this.gemma.sendMessage(
        message,
        callbacks.onToken,
        callbacks.onComplete,
        callbacks.onError,
        controller,
      );
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  async completeMessage(message: string): Promise<{ content: string; totalTime: number }> {
    const result = await this.gemma.sendMessageNonStreaming(message);
    return { content: result.response, totalTime: result.totalTime };
  }

  stop(): void {
    this.gemma.stop();
  }
}
