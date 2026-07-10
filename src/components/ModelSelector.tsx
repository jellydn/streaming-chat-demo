import type { ModelMode } from "../types";

interface Props {
  model: ModelMode;
  onChange: (m: ModelMode) => void;
}

export function ModelSelector({ model, onChange }: Props) {
  const btn = (m: ModelMode) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      model === m ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"
    }`;

  return (
    <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
      <button onClick={() => onChange("openai")} className={btn("openai")}>
        OpenAI
      </button>
      <button onClick={() => onChange("openrouter")} className={btn("openrouter")}>
        OpenRouter
      </button>
      <button onClick={() => onChange("gemma")} className={btn("gemma")}>
        Gemma
      </button>
    </div>
  );
}
