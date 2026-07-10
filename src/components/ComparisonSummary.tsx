/**
 * A static comparison summary explaining the streaming vs non-streaming
 * trade-offs. For live metrics, check each panel's metrics bar.
 */
export function ComparisonSummary() {
  return (
    <div className="border-t border-zinc-800 px-6 py-3 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-6 text-xs text-zinc-500 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span>Streaming:</span>
          <span className="text-zinc-400">
            First token appears quickly → better perceived latency
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Non‑Streaming:</span>
          <span className="text-zinc-400">
            User waits for the full response before seeing any output
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            First visible output
          </div>
          <div className="text-xs text-zinc-300">
            <span className="text-violet-400">Streaming</span> usually much earlier
          </div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            Full completion
          </div>
          <div className="text-xs text-zinc-300">Similar total time for both</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
            User experience
          </div>
          <div className="text-xs text-zinc-300">Streaming feels faster &amp; more responsive</div>
        </div>
      </div>
    </div>
  );
}
