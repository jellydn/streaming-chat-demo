import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";
import type { Metrics } from "./types";

interface GemmaContextValue {
  ready: boolean;
  loadingModel: boolean;
  loadProgress: string;
  initEngine: () => Promise<void>;
  sendMessage: (
    content: string,
    onToken: (token: string) => void,
    onComplete: (metrics: Metrics) => void,
    onError: (err: Error) => void,
    controller: AbortController,
  ) => Promise<void>;
  sendMessageNonStreaming: (
    content: string,
  ) => Promise<{ response: string; totalTime: number; tokenCount: number }>;
  stop: () => void;
}

const GemmaContext = createContext<GemmaContextValue | null>(null);

export function GemmaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const engineRef = useRef<any>(null);
  const abortingRef = useRef(false);

  const initEngine = useCallback(async () => {
    if (engineRef.current) {
      setReady(true);
      return;
    }

    setLoadingModel(true);
    setLoadProgress("Downloading Gemma model...");

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      const engine = await CreateMLCEngine("gemma-2b-it-q4f32_1-MLC", {
        initProgressCallback: (report: { text: string }) => {
          setLoadProgress(report.text);
        },
      });

      engineRef.current = engine;
      setReady(true);
    } catch (err: any) {
      console.error("Gemma engine init failed:", err);
      setLoadProgress(`Failed: ${err.message}`);
    } finally {
      setLoadingModel(false);
    }
  }, []);

  /**
   * Streaming chat: calls onToken for each delta.
   * AbortController stops generation mid-stream by calling engine.interruptGenerate().
   */
  const sendMessage = useCallback(
    async (
      content: string,
      onToken: (token: string) => void,
      onComplete: (metrics: Metrics) => void,
      onError: (err: Error) => void,
      controller: AbortController,
    ) => {
      if (!engineRef.current) {
        onError(new Error("Gemma engine not initialized. Click 'Load Gemma' first."));
        return;
      }

      abortingRef.current = false;
      const startTime = performance.now();
      let firstToken = true;
      let tokenCount = 0;
      let ttft: number | null = null;

      controller.signal.addEventListener("abort", () => {
        abortingRef.current = true;
        try {
          engineRef.current?.interruptGenerate();
        } catch {
          // Engine may not have interruptGenerate; silently ignore
        }
      });

      try {
        const engine = engineRef.current;

        const completion = await engine.chat.completions.create({
          messages: [{ role: "user", content }],
          stream: true,
        });

        for await (const chunk of completion as AsyncIterable<{
          choices?: Array<{ delta?: { content?: string } }>;
        }>) {
          if (abortingRef.current) break;

          const token = chunk.choices?.[0]?.delta?.content;
          if (token) {
            if (firstToken) {
              firstToken = false;
              ttft = performance.now() - startTime;
            }
            tokenCount++;
            onToken(token);
          }
        }

        onComplete({
          timeToFirstToken: ttft,
          totalTime: performance.now() - startTime,
          tokenCount,
        });
      } catch (err: any) {
        if (abortingRef.current || err.name === "AbortError") {
          onComplete({
            timeToFirstToken: ttft,
            totalTime: performance.now() - startTime,
            tokenCount,
          });
        } else {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    },
    [],
  );

  /**
   * Non-streaming chat: collects all tokens silently, returns the full response
   * at once. This enables the side-by-side comparison in Gemma mode.
   */
  const sendMessageNonStreaming = useCallback(
    async (
      content: string,
    ): Promise<{ response: string; totalTime: number; tokenCount: number }> => {
      if (!engineRef.current) {
        throw new Error("Gemma engine not initialized. Click 'Load Gemma' first.");
      }

      abortingRef.current = false;
      const startTime = performance.now();
      let fullResponse = "";
      let tokenCount = 0;

      try {
        const engine = engineRef.current;

        const completion = await engine.chat.completions.create({
          messages: [{ role: "user", content }],
          stream: true,
        });

        for await (const chunk of completion as AsyncIterable<{
          choices?: Array<{ delta?: { content?: string } }>;
        }>) {
          const token = chunk.choices?.[0]?.delta?.content;
          if (token) {
            tokenCount++;
            fullResponse += token;
          }
        }

        return {
          response: fullResponse,
          totalTime: performance.now() - startTime,
          tokenCount,
        };
      } catch (err: any) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortingRef.current = true;
    try {
      engineRef.current?.interruptGenerate();
    } catch {
      // Engine may not expose interruptGenerate; flag alone breaks the loop
    }
  }, []);

  return (
    <GemmaContext.Provider
      value={{
        ready,
        loadingModel,
        loadProgress,
        initEngine,
        sendMessage,
        sendMessageNonStreaming,
        stop,
      }}
    >
      {children}
    </GemmaContext.Provider>
  );
}

export function useGemma(): GemmaContextValue {
  const ctx = useContext(GemmaContext);
  if (!ctx) throw new Error("useGemma must be used within GemmaProvider");
  return ctx;
}
