import { useState, useCallback } from "react";
import { IDLE_METRICS, type PanelState, type ChatMessage } from "../types";
import type { ChatBackend } from "../backends/types";

function buildMetrics(
  totalTime: number,
  tokenCount: number,
): { timeToFirstToken: null; totalTime: number; tokenCount: number } {
  return { timeToFirstToken: null, totalTime, tokenCount };
}

/**
 * Estimate token count from response text.
 * Uses Intl.Segmenter when available; otherwise falls back to word count.
 * Average English token length is ~4 characters, but word-based segmentation
 * gives a more stable estimate across languages.
 */
function estimateTokenCount(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const words = Array.from(segmenter.segment(text)).filter((s) => s.isWordLike);
    return Math.max(1, Math.ceil(words.length * 1.3));
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length * 1.3));
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
        const tokenCount = estimateTokenCount(responseContent);

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
