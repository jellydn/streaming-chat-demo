import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Metrics } from "./types";

export interface GemmaContextValue {
  ready: boolean;
  loadingModel: boolean;
  loadProgress: string;
  /** True when the browser supports WebGPU (required for Gemma). */
  supported: boolean;
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

function checkWebGpuSupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

/** Shared chunk shape for WebLLM streaming. */
type GemmaChunk = { choices?: Array<{ delta?: { content?: string } }> };

/**
 * Async generator that yields tokens from a Gemma streaming completion.
 * Checks abortingRef on each chunk so both streaming and non-streaming paths
 * share the same abort/iteration logic.
 */
async function* streamGemmaTokens(
  engine: any,
  content: string,
  abortingRef: { current: boolean },
): AsyncGenerator<string> {
  const completion = await engine.chat.completions.create({
    messages: [{ role: "user", content }],
    stream: true,
  });

  for await (const chunk of completion as AsyncIterable<GemmaChunk>) {
    if (abortingRef.current) break;
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) yield token;
  }
}

/**
 * Signal handler that sets the abort flag and interrupts the engine.
 * Called when the AbortController fires (either from the Stop button or cleanup).
 * Wrapped in try/catch because some engine versions may not expose interruptGenerate.
 */
function abortEngine(engineRef: { current: any }, abortingRef: { current: boolean }) {
  abortingRef.current = true;
  try {
    engineRef.current?.interruptGenerate();
  } catch {
    // Engine may not expose interruptGenerate; the flag alone breaks the polling loop
  }
}

export function GemmaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [supported] = useState(() => checkWebGpuSupport());
  const engineRef = useRef<any>(null);
  const abortingRef = useRef(false);

  const initEngine = useCallback(async () => {
    if (!supported) {
      setLoadProgress("WebGPU is not supported in this browser.");
      return;
    }

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
   * AbortController stops generation mid-stream via abortEngine().
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

      controller.signal.addEventListener("abort", () => abortEngine(engineRef, abortingRef));

      try {
        for await (const token of streamGemmaTokens(engineRef.current, content, abortingRef)) {
          if (firstToken) {
            firstToken = false;
            ttft = performance.now() - startTime;
          }
          tokenCount++;
          onToken(token);
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
        for await (const token of streamGemmaTokens(engineRef.current, content, abortingRef)) {
          tokenCount++;
          fullResponse += token;
        }

        return {
          response: fullResponse,
          totalTime: performance.now() - startTime,
          tokenCount,
        };
      } catch (err: any) {
        if (abortingRef.current) {
          return {
            response: fullResponse,
            totalTime: performance.now() - startTime,
            tokenCount,
          };
        }
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [],
  );

  /**
   * Sets the abort flag and interrupts the engine. The AbortController in
   * useStreamingChat.ts also fires controller.abort(), which triggers the
   * signal listener — but stop() directly interrupts as well so the effect
   * is immediate even before the signal listener runs.
   */
  const stop = useCallback(() => {
    abortEngine(engineRef, abortingRef);
  }, []);

  return (
    <GemmaContext.Provider
      value={useMemo(
        () => ({
          ready,
          loadingModel,
          loadProgress,
          supported,
          initEngine,
          sendMessage,
          sendMessageNonStreaming,
          stop,
        }),
        [ready, loadingModel, loadProgress, initEngine, sendMessage, sendMessageNonStreaming, stop],
      )}
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
