import type { Metrics } from "../types";

interface Props {
  metrics: Metrics;
  mode: "streaming" | "non-streaming";
}

export function MetricsBar({ metrics, mode }: Props) {
  const { timeToFirstToken, totalTime, tokenCount } = metrics;

  if (totalTime == null && timeToFirstToken == null) {
    return (
      <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600 flex gap-4">
        <span>Waiting for metrics…</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-t border-zinc-800 text-xs font-mono flex gap-5 flex-wrap">
      <Metric label="TTFB" value={timeToFirstToken} unit="ms" mode={mode} />
      <Metric label="Total" value={totalTime} unit="ms" mode={mode} />
      <span className="text-zinc-500">
        <span className="text-zinc-400">{tokenCount}</span> tokens
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  mode,
}: {
  label: string;
  value: number | null;
  unit: string;
  mode: "streaming" | "non-streaming";
}) {
  if (value == null) {
    return <span className="text-zinc-600">{label}: —</span>;
  }

  const color = mode === "streaming" ? "text-violet-400" : "text-amber-400";

  return (
    <span>
      <span className="text-zinc-500">{label}: </span>
      <span className={color}>{Math.round(value)}</span>
      <span className="text-zinc-600"> {unit}</span>
    </span>
  );
}
