import { useRef, useEffect } from "react";
import type { ChatMessage, Metrics } from "../types";
import { MetricsBar } from "./MetricsBar";

export interface ChatPanelLayoutProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  metrics: Metrics;
  mode: "streaming" | "non-streaming";

  /** True when the panel is blocked (e.g. Gemma not yet loaded). */
  blocked: boolean;

  /** Placeholder shown when message list is empty. */
  emptyMessage: string;

  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;

  /** Whether the Send button can be clicked. */
  canSubmit: boolean;

  /** Input disabled text when blocked. */
  blockedPlaceholder: string;

  /** Show Stop button instead of Send (streaming-only). */
  showStop: boolean;
  onStop: () => void;

  onReset: () => void;

  /** Slot for content above the message list (e.g. GemmaLoader). */
  topSlot?: React.ReactNode;
}

/**
 * Pure UI shell for a chat panel — messages, input, metrics bar.
 * No hook knowledge, no model-specific logic. Composed by StreamingPanel
 * and NonStreamingPanel which each provide their own hook data.
 */
export function ChatPanelLayout({
  messages,
  isLoading,
  isStreaming,
  error,
  metrics,
  mode,
  blocked,
  emptyMessage,
  inputValue,
  onInputChange,
  onSubmit,
  canSubmit,
  blockedPlaceholder,
  showStop,
  onStop,
  onReset,
  topSlot,
}: ChatPanelLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages/tokens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when loading completes
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top slot — e.g. GemmaLoader */}
      {topSlot}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-zinc-600 py-12 text-sm">{emptyMessage}</div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-violet-600/20 text-violet-100 border border-violet-500/30"
                  : "bg-zinc-800 text-zinc-200 border border-zinc-700/50"
              } ${
                msg.role === "assistant" && i === messages.length - 1 && isStreaming
                  ? "typing-cursor"
                  : ""
              }`}
            >
              {msg.content}
              {msg.role === "assistant" &&
                i === messages.length - 1 &&
                isLoading &&
                !isStreaming &&
                !msg.content && <span className="loading-pulse text-zinc-500">Thinking…</span>}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-center text-red-400 text-xs bg-red-400/10 rounded-lg py-2 px-3">
            {error}
          </div>
        )}
      </div>

      {/* Metrics */}
      <MetricsBar metrics={metrics} mode={mode} />

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={blocked}
          placeholder={
            blocked ? blockedPlaceholder : isLoading ? "Generating response…" : "Type a message…"
          }
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
        />

        {showStop ? (
          <button
            type="button"
            onClick={onStop}
            className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-600/30 transition-colors"
          >
            ⏹ Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
          title="Clear conversation"
        >
          ↺
        </button>
      </form>
    </div>
  );
}
