import type { ChatBackend, StreamCallbacks } from "./types";
import { streamChat, fetchChat } from "../lib/api";

/**
 * Backend for cloud-hosted models accessed via the Hono proxy server.
 * Works with both OpenAI and OpenRouter — the provider string is sent
 * to the server, which dispatches to the correct upstream API.
 */
export class ServerBackend implements ChatBackend {
  readonly name: string;
  readonly ready = true;

  constructor(private provider: "openai" | "openrouter") {
    this.name = provider;
  }

  streamMessage(message: string, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void> {
    return streamChat(message, this.provider, signal, callbacks);
  }

  async completeMessage(message: string): Promise<{ content: string; totalTime: number }> {
    return fetchChat(message, this.provider);
  }

  /** No-op — cancellation is handled by the AbortController passed to fetch. */
  stop(): void {}
}
