import { useState, useCallback } from "react";
import { IDLE_METRICS, type PanelState, type ChatMessage } from "../types";
import type { ChatBackend } from "../backends/types";

function buildMetrics(
  totalTime: number,
  tokenCount: number,
): { timeToFirstToken: null; totalTime: number; tokenCount: number } {
  return { timeToFirstToken: null, totalTime, tokenCount };
}

export function useNonStreamingChat(panelId: string, backend: ChatBackend) {
  const [state, setState] = useState<PanelState>({
    id: panelId,
    mode: "non-streaming",
    model: backend.name as PanelState["model"],
    messages: [],
    isLoading: false,
    isStreaming: false,
    metrics: IDLE_METRICS,
    error: null,
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
        metrics: IDLE_METRICS,
      }));

      try {
        const { content: responseContent, totalTime } = await backend.completeMessage(content);
        // Rough English-text estimate: ~4 characters per token
        const CHARS_PER_TOKEN = 4;
        const tokenCount = Math.ceil(responseContent.length / CHARS_PER_TOKEN);

        setState((prev) => {
          const msgs = [...prev.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: responseContent || "[empty response]",
          };
          return {
            ...prev,
            messages: msgs,
            isLoading: false,
            metrics: buildMetrics(totalTime, tokenCount),
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
    [backend],
  );

  const reset = useCallback(() => {
    setState({
      id: panelId,
      mode: "non-streaming",
      model: backend.name as PanelState["model"],
      messages: [],
      isLoading: false,
      isStreaming: false,
      metrics: IDLE_METRICS,
      error: null,
    });
  }, [panelId, backend.name]);

  return { state, sendMessage, reset };
}
