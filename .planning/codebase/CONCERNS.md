# Codebase Concerns

**Analysis Date:** 2026-07-11

## Resolved

- **CORS restricted** — `server/app.ts` now restricts origins via `ALLOWED_ORIGINS` env var (defaults to `http://localhost:5173`).
- **Upstream abort propagation** — `server/app.ts` passes the incoming request's `AbortSignal` to the upstream OpenAI/OpenRouter `fetch`.
- **Rate limiting** — Simple in-memory rate limiter added: 10 requests/minute per IP on `/api/chat` and `/api/chat/stream`.
- **Gemma WebGPU check** — `src/GemmaContext.tsx` exposes `supported` flag and surfaces a clear message when WebGPU is unavailable.
- **Non-streaming token estimate** — `src/hooks/useNonStreamingChat.ts` now uses `Intl.Segmenter` word segmentation with a tokens-per-word heuristic.
- **Streaming state update batching** — `src/hooks/useStreamingChat.ts` batches incoming tokens and flushes to React state every 50 ms.
- **Tests added** — Vitest configured with `src/lib/api.test.ts` and `server/app.test.ts`.

## Remaining Trade-offs

- **Console logging only** — No structured logging or error tracking. Acceptable for a demo; add Sentry/Datadog if productionized.
- **Gemma model size** — ~1.3 GB download remains; WebGPU check now provides a graceful message but no smaller fallback model.
- **Large Gemma bundle** — `@mlc-ai/web-llm` is large; it is already lazy-loaded, but the chunk is still sizable.
- **Single Node process** — Acceptable for a demo; scale horizontally behind a load balancer if needed.
- **Single shared Gemma engine instance** — Shared via React Context; acceptable for a demo.
- **No caching or persistence layer** — Chat state is ephemeral by design.

## Dependencies at Risk

- **@mlc-ai/web-llm** — Experimental, WebGPU/Chrome-only, API may change.
- **No lockfile reproducibility concerns** — `bun.lock` is present.

---

_Concerns audit: 2026-07-11_
