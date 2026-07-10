/** Shared types for the streaming chat demo */

export type ModelMode = "openai" | "gemma";

export interface Metrics {
  timeToFirstToken: number | null; // ms
  totalTime: number | null; // ms
  tokenCount: number;
}

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
  controller: AbortController | null;
}
