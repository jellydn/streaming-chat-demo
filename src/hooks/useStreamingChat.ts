import { useState, useRef, useCallback } from "react";
import { IDLE_METRICS, type PanelState, type ChatMessage } from "../types";
import type { ChatBackend } from "../backends/types";

export function useStreamingChat(panelId: string, backend: ChatBackend) {
  const [state, setState] = useState<PanelState>({
    id: panelId,
    mode: "streaming",
    model: backend.name as PanelState["model"],
    messages: [],
    isLoading: false,
    isStreaming: false,
    metrics: IDLE_METRICS,
    error: null,
  });

  const ttftRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingTokensRef = useRef<string>("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content };
      const assistantMsg: ChatMessage = { role: "assistant", content: "" };

      const controller = new AbortController();
      controllerRef.current = controller;
      ttftRef.current = null;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        isStreaming: true,
        error: null,
        metrics: IDLE_METRICS,
      }));

      const flushPendingTokens = () => {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        if (pendingTokensRef.current === "") return;
        const batch = pendingTokensRef.current;
        pendingTokensRef.current = "";
        setState((prev) => {
          const msgs = [...prev.messages];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, content: last.content + batch };
          return { ...prev, messages: msgs };
        });
      };

      const scheduleFlush = () => {
        if (flushTimerRef.current) return;
        flushTimerRef.current = setTimeout(flushPendingTokens, 50);
      };

      const handleToken = (token: string) => {
        pendingTokensRef.current += token;
        scheduleFlush();
      };

      const handleTTFB = (ms: number) => {
        ttftRef.current = ms;
      };

      const handleComplete = (metrics: {
        timeToFirstToken: number | null;
        totalTime: number | null;
        tokenCount: number;
      }) => {
        controllerRef.current = null;
        flushPendingTokens();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          metrics: {
            timeToFirstToken: ttftRef.current,
            totalTime: metrics.totalTime,
            tokenCount: metrics.tokenCount,
          },
        }));
      };

      const handleError = (err: Error) => {
        controllerRef.current = null;
        flushPendingTokens();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: err.message,
        }));
      };

      await backend.streamMessage(content, controller.signal, {
        onToken: handleToken,
        onTTFB: handleTTFB,
        onComplete: handleComplete,
        onError: handleError,
      });
    },
    [backend],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    backend.stop();
    controllerRef.current = null;
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
    }));
  }, [backend]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    backend.stop();
    controllerRef.current = null;
    setState({
      id: panelId,
      mode: "streaming",
      model: backend.name as PanelState["model"],
      messages: [],
      isLoading: false,
      isStreaming: false,
      metrics: IDLE_METRICS,
      error: null,
    });
  }, [panelId, backend.name]);

  return { state, sendMessage, stop, reset };
}
