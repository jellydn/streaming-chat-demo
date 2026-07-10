/** Shared types for the streaming chat demo */

export type ModelMode = "openai" | "openrouter" | "gemma";

export interface Metrics {
  timeToFirstToken: number | null; // ms
  totalTime: number | null; // ms
  tokenCount: number;
}

/** Shared idle-metrics sentinel — avoids repeating the literal 6× across hooks. */
export const IDLE_METRICS: Metrics = {
  timeToFirstToken: null,
  totalTime: null,
  tokenCount: 0,
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PanelState {
  id: string;
  mode: "streaming" | "non-streaming";
  model: ModelMode;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  metrics: Metrics;
  error: string | null;
}
