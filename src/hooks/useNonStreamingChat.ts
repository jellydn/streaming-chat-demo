import { useState, useCallback } from "react";
import type { PanelState, ModelMode, ChatMessage } from "../types";
import { fetchChat } from "../lib/api";
import { useGemma } from "../GemmaContext";

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

  const gemma = useGemma();

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
        if (model === "gemma") {
          const { response, totalTime, tokenCount } = await gemma.sendMessageNonStreaming(content);

          setState((prev) => {
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content: response || "[empty response]",
            };
            return {
              ...prev,
              messages: msgs,
              isLoading: false,
              metrics: {
                timeToFirstToken: null,
                totalTime,
                tokenCount,
              },
            };
          });
          return;
        }

        const { content: responseContent, totalTime } = await fetchChat(content);

        setState((prev) => {
          const msgs = [...prev.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: responseContent || "[empty response]",
          };
          // Token count estimate: ~4 chars per token for English text
          const tokenCount = Math.ceil(responseContent.length / 4);
          return {
            ...prev,
            messages: msgs,
            isLoading: false,
            metrics: {
              timeToFirstToken: null,
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
    [model, gemma],
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
