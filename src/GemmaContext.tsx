import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";

interface GemmaContextValue {
  ready: boolean;
  loadingModel: boolean;
  loadProgress: string;
  initEngine: () => Promise<void>;
  sendMessage: (
    content: string,
    onToken: (token: string) => void,
    onComplete: (metrics: {
      timeToFirstToken: number | null;
      totalTime: number | null;
      tokenCount: number;
    }) => void,
    onError: (err: Error) => void,
    controller: AbortController,
  ) => Promise<void>;
  stop: () => void;
}

const GemmaContext = createContext<GemmaContextValue | null>(null);

export function GemmaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const engineRef = useRef<any>(null);
  const currentControllerRef = useRef<AbortController | null>(null);

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

  const sendMessage = useCallback(
    async (
      content: string,
      onToken: (token: string) => void,
      onComplete: (metrics: {
        timeToFirstToken: number | null;
        totalTime: number | null;
        tokenCount: number;
      }) => void,
      onError: (err: Error) => void,
      controller: AbortController,
    ) => {
      if (!engineRef.current) {
        onError(new Error("Gemma engine not initialized. Click 'Load Gemma' first."));
        return;
      }

      currentControllerRef.current = controller;
      const startTime = performance.now();
      let firstToken = true;
      let tokenCount = 0;
      let ttft: number | null = null;

      try {
        const engine = engineRef.current;

        const abortPromise = new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });

        const completion = engine.chat.completions.create({
          messages: [{ role: "user", content }],
          stream: true,
        });

        const chunks = await Promise.race([completion, abortPromise]);

        for await (const chunk of chunks as AsyncIterable<{
          choices?: Array<{ delta?: { content?: string } }>;
        }>) {
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
        if (err.name === "AbortError" || err instanceof DOMException) {
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

  const stop = useCallback(() => {
    currentControllerRef.current?.abort();
  }, []);

  return (
    <GemmaContext.Provider
      value={{ ready, loadingModel, loadProgress, initEngine, sendMessage, stop }}
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
