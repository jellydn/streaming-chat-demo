import type { Metrics } from "../types";

/** Callbacks emitted during streaming generation. */
export interface StreamCallbacks {
  onToken: (token: string) => void;
  onTTFB: (ms: number) => void;
  onComplete: (metrics: Metrics) => void;
  onError: (err: Error) => void;
}

/**
 * Narrow interface behind which every AI model lives as an adapter.
 * Hooks call only these methods — no model-specific branching.
 */
export interface ChatBackend {
  /** Human-readable identifier (e.g. "openai", "gemma"). */
  readonly name: string;

  /** True when the backend is ready to accept messages. */
  readonly ready: boolean;

  /**
   * Stream tokens one-by-one via callbacks.
   * The signal cancels generation (fetch abort, engine interrupt, etc.).
   */
  streamMessage(message: string, signal: AbortSignal, callbacks: StreamCallbacks): Promise<void>;

  /**
   * Complete a full response and return the entire content at once.
   * Used by the non-streaming panel for side-by-side comparison.
   */
  completeMessage(message: string): Promise<{ content: string; totalTime: number }>;

  /** Cancel any in-flight generation. Idempotent. */
  stop(): void;
}
