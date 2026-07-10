import { useGemma } from "../GemmaContext";

/**
 * Gemma loader UI shown in the streaming panel.
 * Uses the shared GemmaContext so the chat hook can access the same engine.
 */
export function GemmaLoader() {
  const { ready, loadingModel, loadProgress, initEngine } = useGemma();

  if (ready) return null;

  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-amber-500/5">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-zinc-400 mb-1">
            Gemma runs entirely in your browser — no API key needed.
          </p>
          <p className="text-[11px] text-zinc-600">
            Model size: ~1.3 GB · Uses WebGPU · One-time download
          </p>
          {loadingModel && <p className="text-[11px] text-amber-500 mt-1">{loadProgress}</p>}
        </div>
        <button
          onClick={initEngine}
          disabled={loadingModel}
          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            loadingModel
              ? "bg-zinc-800 text-zinc-500 cursor-wait"
              : "bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
          }`}
        >
          {loadingModel ? "⏳ Loading…" : "Load Gemma"}
        </button>
      </div>
    </div>
  );
}
