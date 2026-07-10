import { useState } from "react";
import type { ModelMode } from "./types";
import { useBackend } from "./backends/useBackend";
import { StreamingPanel } from "./components/StreamingPanel";
import { NonStreamingPanel } from "./components/NonStreamingPanel";
import { ModelSelector } from "./components/ModelSelector";
import { ComparisonSummary } from "./components/ComparisonSummary";

export function App() {
  const [model, setModel] = useState<ModelMode>("openai");
  const backend = useBackend(model);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Streaming vs. Non‑Streaming</h1>
              <p className="text-xs text-zinc-500">
                AI chat comparison · measure perceived latency
              </p>
            </div>
          </div>
          <ModelSelector model={model} onChange={setModel} />
        </div>
      </header>

      {/* Side-by-side panels */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 p-4 max-w-7xl mx-auto w-full">
        {/* Streaming panel */}
        <div className="flex-1 flex flex-col min-h-0 border border-zinc-800 rounded-xl overflow-hidden m-1 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/80">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-sm font-medium">Streaming</span>
            <span className="text-xs text-zinc-500 ml-auto">Tokens appear in real time</span>
          </div>
          <StreamingPanel key={`streaming-${model}`} backend={backend} />
        </div>

        {/* Non-streaming panel */}
        <div className="flex-1 flex flex-col min-h-0 border border-zinc-800 rounded-xl overflow-hidden m-1 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/80">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-medium">Non‑Streaming</span>
            <span className="text-xs text-zinc-500 ml-auto">Full response appears at once</span>
          </div>
          <NonStreamingPanel key={`non-streaming-${model}`} backend={backend} />
        </div>
      </main>

      {/* Comparison summary */}
      <ComparisonSummary />

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600">
        Streaming does not reduce total generation time — it improves{" "}
        <span className="text-zinc-400">perceived latency</span> by showing output as it arrives.
      </footer>
    </div>
  );
}
