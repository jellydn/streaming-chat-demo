import { useState } from "react";
import type { ChatBackend } from "../backends/types";
import { useNonStreamingChat } from "../hooks/useNonStreamingChat";
import { ChatPanelLayout } from "./ChatPanelLayout";

interface Props {
  backend: ChatBackend;
}

/**
 * Non-streaming chat panel — calls only useNonStreamingChat.
 * No model branching: the backend handles dispatch internally.
 * No Stop button (non-streaming has nothing to cancel).
 */
export function NonStreamingPanel({ backend }: Props) {
  const { state, sendMessage, reset } = useNonStreamingChat("non-streaming", backend);

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
      isStreaming={false}
      error={state.error}
      metrics={state.metrics}
      mode="non-streaming"
      blocked={isGemmaNotReady}
      emptyMessage={
        isGemmaNotReady
          ? "Load the Gemma model in the Streaming panel first"
          : "Send a message to see full output at once"
      }
      inputValue={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      canSubmit={canSubmit}
      blockedPlaceholder="Load Gemma model first…"
      showStop={false}
      onStop={() => {}}
      onReset={reset}
    />
  );
}
