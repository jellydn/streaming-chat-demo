import { useRef, useEffect, useState } from "react";
import type { ModelMode } from "../types";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { useNonStreamingChat } from "../hooks/useNonStreamingChat";
import { MetricsBar } from "./MetricsBar";
import { GemmaLoader } from "./GemmaLoader";

interface Props {
  mode: "streaming" | "non-streaming";
  model: ModelMode;
  panelId: string;
}

export function ChatPanel({ mode, model, panelId }: Props) {
  const streaming = useStreamingChat(panelId, model);
  const nonStreaming = useNonStreamingChat(panelId, model);

  const state = mode === "streaming" ? streaming.state : nonStreaming.state;
  const sendMessage = mode === "streaming" ? streaming.sendMessage : nonStreaming.sendMessage;
  const reset = mode === "streaming" ? streaming.reset : nonStreaming.reset;
  // Stop is only meaningful for streaming mode
  const stop = streaming.stop;
  const gemmaReady = mode === "streaming" ? streaming.gemmaReady : undefined;

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages/tokens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages]);

  // Focus input when loading completes
  useEffect(() => {
    if (!state.isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || state.isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const isBlocked = state.isLoading && model === "gemma" && !gemmaReady;
  const canSubmit = input.trim().length > 0 && !state.isLoading && !isBlocked;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Gemma loader */}
      {model === "gemma" && mode === "streaming" && !gemmaReady && <GemmaLoader />}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {state.messages.length === 0 && (
          <div className="text-center text-zinc-600 py-12 text-sm">
            {isBlocked
              ? "Load the Gemma model above to start chatting"
              : `Send a message to see ${mode === "streaming" ? "token-by-token" : "full"} output`}
          </div>
        )}

        {state.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-violet-600/20 text-violet-100 border border-violet-500/30"
                  : "bg-zinc-800 text-zinc-200 border border-zinc-700/50"
              } ${
                msg.role === "assistant" && i === state.messages.length - 1 && state.isStreaming
                  ? "typing-cursor"
                  : ""
              }`}
            >
              {msg.content}
              {msg.role === "assistant" &&
                i === state.messages.length - 1 &&
                state.isLoading &&
                !state.isStreaming &&
                !msg.content && <span className="loading-pulse text-zinc-500">Thinking…</span>}
            </div>
          </div>
        ))}

        {state.error && (
          <div className="text-center text-red-400 text-xs bg-red-400/10 rounded-lg py-2 px-3">
            {state.error}
          </div>
        )}
      </div>

      {/* Metrics */}
      <MetricsBar metrics={state.metrics} mode={mode} />

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isBlocked}
          placeholder={
            isBlocked
              ? "Load Gemma model first…"
              : state.isLoading
                ? "Generating response…"
                : "Type a message…"
          }
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
        />

        {/* Only show Stop in streaming mode when loading */}
        {mode === "streaming" && state.isLoading ? (
          <button
            type="button"
            onClick={stop}
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
          onClick={reset}
          className="px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
          title="Clear conversation"
        >
          ↺
        </button>
      </form>
    </div>
  );
}
