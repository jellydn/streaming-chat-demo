import { useState, useRef, useCallback } from "react";
import type { PanelState, ModelMode, ChatMessage } from "../types";
import { streamChat } from "../lib/api";
import { useGemma } from "../GemmaContext";

export function useStreamingChat(panelId: string, model: ModelMode) {
  const [state, setState] = useState<PanelState>({
    id: panelId,
    mode: "streaming",
    model,
    messages: [],
    isLoading: false,
    isStreaming: false,
    metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
    error: null,
    controller: null,
  });

  const ttftRef = useRef<number | null>(null);
  const gemma = useGemma();

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content };
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };

      const controller = new AbortController();
      ttftRef.current = null;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        isStreaming: true,
        error: null,
        metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
        controller,
      }));

      const handleToken = (token: string) => {
        setState((prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, content: last.content + token };
          return { ...prev, messages: msgs };
        });
      };

      const handleTTFB = (ms: number) => {
        ttftRef.current = ms;
      };

      const handleComplete = (metrics: {
        timeToFirstToken: number | null;
        totalTime: number | null;
        tokenCount: number;
      }) => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          controller: null,
          metrics: {
            timeToFirstToken: ttftRef.current,
            totalTime: metrics.totalTime,
            tokenCount: metrics.tokenCount,
          },
        }));
      };

      const handleError = (err: Error) => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: err.message,
          controller: null,
        }));
      };

      if (model === "gemma") {
        await gemma.sendMessage(content, handleToken, handleComplete, handleError, controller);
      } else {
        await streamChat(content, controller.signal, {
          onToken: handleToken,
          onTTFB: handleTTFB,
          onComplete: handleComplete,
          onError: handleError,
        });
      }
    },
    [model, gemma],
  );

  const stop = useCallback(() => {
    state.controller?.abort();
    if (model === "gemma") {
      gemma.stop();
    }
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      controller: null,
    }));
  }, [state.controller, model, gemma]);

  const reset = useCallback(() => {
    state.controller?.abort();
    setState({
      id: panelId,
      mode: "streaming",
      model,
      messages: [],
      isLoading: false,
      isStreaming: false,
      metrics: { timeToFirstToken: null, totalTime: null, tokenCount: 0 },
      error: null,
      controller: null,
    });
  }, [panelId, model, state.controller]);

  return { state, sendMessage, stop, reset, gemmaReady: gemma.ready };
}
