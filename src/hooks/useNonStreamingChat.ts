import { useState, useCallback } from "react";
import type { PanelState, ModelMode, ChatMessage } from "../types";
import { fetchChat } from "../lib/api";

export function useNonStreamingChat(panelId: string, model: ModelMode) {
  const [state, setState] = useState<PanelState>({
    id: panelId,
    mode: "non-streaming",
    model,
    messages: [],
    isLoading: false,
    isStreaming: false,
    metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
    error: null,
    controller: null,
  });

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content };
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        error: null,
        metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
      }));

      try {
        // For Gemma non-streaming, we simulate (WebLLM always streams)
        if (model === "gemma") {
          // Non-streaming Gemma isn't practical — show a note
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Non-streaming mode with browser-based AI is not supported. Use OpenAI.",
          }));
          return;
        }

        const { content: responseContent, totalTime } = await fetchChat(content);

        setState((prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = {
            ...last,
            content: responseContent || "[empty response]",
          };
          const tokenCount = responseContent.split(/\s+/).filter(Boolean).length;
          return {
            ...prev,
            messages: msgs,
            isLoading: false,
            metrics: {
              timeToFirstToken: totalTime,
              totalTime,
              tokenCount,
            },
          };
        });
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message ?? "Unknown error",
        }));
      }
    },
    [model],
  );

  const reset = useCallback(() => {
    setState({
      id: panelId,
      mode: "non-streaming",
      model,
      messages: [],
      isLoading: false,
      isStreaming: false,
      metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
      error: null,
      controller: null,
    });
  }, [panelId, model]);

  return { state, sendMessage, reset };
}
