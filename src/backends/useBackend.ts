import { useMemo } from "react";
import type { ModelMode } from "../types";
import type { ChatBackend } from "./types";
import { ServerBackend } from "./server";
import { GemmaBackend } from "./gemma";
import { useGemma } from "../GemmaContext";

/**
 * Returns the correct ChatBackend adapter for the selected model.
 * Hooks and components call this once and use `backend` everywhere —
 * no model-specific branching in UI code.
 */
export function useBackend(model: ModelMode): ChatBackend {
  const gemma = useGemma();

  return useMemo((): ChatBackend => {
    switch (model) {
      case "openai":
        return new ServerBackend("openai");
      case "openrouter":
        return new ServerBackend("openrouter");
      case "gemma":
        return new GemmaBackend(gemma);
    }
  }, [model, gemma]);
}
