import { useState } from "react";
import type { ChatBackend } from "../backends/types";
import { useStreamingChat } from "../hooks/useStreamingChat";
import { GemmaLoader } from "./GemmaLoader";
import { ChatPanelLayout } from "./ChatPanelLayout";

interface Props {
  backend: ChatBackend;
}

/**
 * Streaming chat panel — calls only useStreamingChat.
 * No model branching: the backend handles dispatch internally.
 */
export function StreamingPanel({ backend }: Props) {
  const { state, sendMessage, stop, reset } = useStreamingChat("streaming", backend);

  const [input, setInput] = useState("");

  const isGemmaNotReady = !backend.ready;
  const canSubmit = input.trim().length > 0 && !state.isLoading && !isGemmaNotReady;

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || state.isLoading || isGemmaNotReady) return;
    setInput("");
    sendMessage(trimmed);
  };

  return (
    <ChatPanelLayout
      messages={state.messages}
      isLoading={state.isLoading}
      isStreaming={state.isStreaming}
      error={state.error}
      metrics={state.metrics}
      mode="streaming"
      blocked={isGemmaNotReady}
      emptyMessage={
        isGemmaNotReady
          ? "Load the Gemma model above to start chatting"
          : "Send a message to see token-by-token output"
      }
      inputValue={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      canSubmit={canSubmit}
      blockedPlaceholder="Load Gemma model first…"
      showStop={state.isLoading}
      onStop={stop}
      onReset={reset}
      topSlot={backend.name === "gemma" && !backend.ready ? <GemmaLoader /> : undefined}
    />
  );
}
