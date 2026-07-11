# Architecture

**Analysis Date:** 2026-07-11

## Pattern Overview

Client-server demo comparing streaming vs non-streaming AI chat. A React (Vite) frontend talks to a Hono Node backend for cloud modes (OpenAI/OpenRouter) or runs a Gemma model entirely in the browser via WebLLM/WebGPU.

Key characteristics:

- Two independent TypeScript projects: `tsconfig.app.json` (client) and `tsconfig.server.json` (server).
- **ChatBackend adapter pattern** — `ServerBackend` and `GemmaBackend` implement a common interface; hooks and components never branch on `ModelMode`.
- Side-by-side comparison: `StreamingPanel` and `NonStreamingPanel` share the same `model` selection.
- Server is a thin proxy: forwards requests to OpenAI/OpenRouter and pipes responses back.

## Layers

### Client Application Layer (React)

- **Location:** `src/`
- **Responsibilities:** Render UI, manage per-panel chat state, drive inference backends, display metrics.
- **Key files:** `src/App.tsx`, `src/GemmaContext.tsx`, `src/backends/useBackend.ts`, `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`, `src/lib/api.ts`.

### Server Layer (Hono / Node)

- **Location:** `server/`
- **Responsibilities:** Proxy client requests to OpenAI/OpenRouter, inject API keys, stream or return completions.
- **Key files:** `server/app.ts`, `server/index.ts`

### Build / Tooling Layer

- **Location:** `vite.config.ts`, `tsconfig*.json`, `package.json`
- **Responsibilities:** Compile, bundle, type-check, lint, format, proxy `/api` in dev.

## Data Flow

### OpenAI/OpenRouter Streaming

1. `StreamingPanel` → `useStreamingChat.sendMessage` → `streamChat` in `src/lib/api.ts`.
2. `streamChat` POSTs to `/api/chat/stream`.
3. Hono server forwards to OpenAI/OpenRouter with `stream: true`.
4. Server pipes raw SSE bytes back to client.
5. Client parses `data:` lines and appends each delta to the last assistant message.

### OpenAI/OpenRouter Non-Streaming

1. `NonStreamingPanel` → `useNonStreamingChat.sendMessage` → `fetchChat` in `src/lib/api.ts`.
2. `fetchChat` POSTs to `/api/chat`.
3. Server forwards to OpenAI/OpenRouter with `stream: false`.
4. Server returns `{ content }` JSON.

### Gemma In-Browser

1. User clicks "Load Gemma" → `GemmaContext.initEngine()`.
2. WebLLM engine is created and stored in a ref.
3. `GemmaBackend` routes `streamMessage` and `completeMessage` to the engine.
4. Streaming and non-streaming both work in Gemma mode.

## Key Abstractions

- **`ChatBackend`** (`src/backends/types.ts`) — Common interface for all backends.
- **`ServerBackend`** (`src/backends/server.ts`) — Wraps cloud API calls.
- **`GemmaBackend`** (`src/backends/gemma.ts`) — Wraps WebLLM engine.
- **`useBackend(model)`** (`src/backends/useBackend.ts`) — Returns the right adapter.
- **`PanelState`** (`src/types.ts`) — Normalized state for one chat panel.
- **`IDLE_METRICS`** (`src/types.ts`) — Shared idle-metrics sentinel.

## Entry Points

- **Client:** `src/main.tsx` → `index.html`
- **Server:** `server/index.ts`
- **Vercel Edge:** `api/[...route].ts`

## Error Handling

- Server returns 500 for missing API keys, 502 for upstream errors.
- Client surfaces errors in `PanelState.error` and renders them in the panel.
- `AbortError` is treated as completion, not failure.

---

_Architecture analysis: 2026-07-11_
