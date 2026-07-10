# Architecture

**Analysis Date:** 2026-07-10

## Pattern Overview

**Overall:** Client-server demo with a thin pass-through proxy backend and a dual-mode (cloud + in-browser) AI chat. A React (Vite) single-page client compares streaming vs non-streaming generation side-by-side against either the OpenAI cloud API (via a Hono Node server) or a browser-side WebLLM/Gemma model. It is a demonstration app, not a production system: the server is a minimal reverse-proxy that forwards to OpenAI and pipes the raw SSE body back, keeping no business logic of its own.

**Key Characteristics:**

- Two independent TypeScript projects compiled under one repo: `tsconfig.app.json` (DOM/client) and `tsconfig.server.json` (Node/server), wired together by the root `tsconfig.json` project references.
- Side-by-side comparison: a single `App` renders two `ChatPanel` instances (streaming + non-streaming) that share the same `model` selection.
- Dual inference backends selected by `ModelMode` (`"openai" | "gemma"`): OpenAI cloud (server-proxied) or Gemma in-browser (WebLLM, WebGPU).
- Server is a pipe/adapter: streaming uses Hono `stream()` to forward OpenAI's SSE bytes verbatim; non-streaming returns a `{ content }` JSON envelope.
- Cancelation via `AbortController` everywhere; streaming-only Stop button.
- Metrics-first design: each panel measures `timeToFirstToken` (TTFB), `totalTime`, and `tokenCount` to make perceived-latency differences visible.

## Layers

**Client Application Layer (React):**

- Purpose: Render the UI, manage per-panel chat state, drive both inference backends, and display live metrics.
- Location: `src/`
- Contains: React components (`src/components/*.tsx`), custom hooks (`src/hooks/*.ts`), the Gemma browser-engine context (`src/GemmaContext.tsx`), shared types (`src/types.ts`), the SSE/HTTP client (`src/lib/api.ts`), styling (`src/index.css`), and the DOM entry point (`src/main.tsx`).
- Depends on: `src/lib/api.ts` (fetch to `/api`), `src/GemmaContext.tsx` (in-browser engine), `src/types.ts`.
- Used by: `index.html` → `src/main.tsx` (entry).

**Server Layer (Hono / Node):**

- Purpose: Proxy client requests to OpenAI, inject the server-side `OPENAI_API_KEY`, and stream or return completions. Serves as the `/api` backend that Vite proxies to.
- Location: `server/index.ts`
- Contains: Hono app with `POST /api/chat/stream`, `POST /api/chat`, `GET /api/health`; CORS middleware; `@hono/node-server` bootstrap.
- Depends on: OpenAI REST API (`https://api.openai.com/v1/chat/completions`), env var `OPENAI_API_KEY`, optional `PORT`.
- Used by: The Vite dev proxy (`vite.config.ts`) which forwards `/api` → `http://localhost:3001`.

**Build / Tooling Layer:**

- Purpose: Compile, bundle, type-check, lint, and format both projects; proxy `/api` in dev.
- Location: `vite.config.ts`, `tsconfig*.json`, `package.json`, `.oxlintrc.json`, `oxfmt.toml`, `index.html`.
- Contains: Vite + React + Tailwind v4 config, dual tsconfig project references, `concurrently` dev orchestration, `oxlint`/`oxfmt`.
- Depends on: `tsx` (server dev), `vite` (client dev/build).
- Used by: `npm run dev` (runs server `:3001` and client `:5173` concurrently).

## Data Flow

**OpenAI streaming (cloud, `model === "openai"`, streaming panel):**

1. `ChatPanel` (streaming) calls `useStreamingChat.sendMessage` → `src/lib/api.ts` `streamChat(message, signal, callbacks)`.
2. `streamChat` POSTs to `/api/chat/stream`; Vite proxy forwards to `server/index.ts` (`POST /api/chat/stream`).
3. Server reads `OPENAI_API_KEY`; on missing key returns `500 { error: "OPENAI_API_KEY not set on server" }`.
4. Server calls OpenAI with `stream: true`; on non-OK returns the upstream error JSON with the upstream status.
5. On success, server uses Hono `stream(c, async (s) => { await s.pipe(response.body!) })` to forward OpenAI's raw SSE bytes verbatim.
6. `streamChat` reads the `ReadableStream` with a `TextDecoder`, buffers partial lines, splits on `\n`, and parses `data: <json>` lines. `[DONE]` triggers `onComplete`; each `choices[0].delta.content` triggers `onToken` and the first token triggers `onTTFB`.
7. `useStreamingChat` reducer appends each token to the last assistant message (`content + token`) and records metrics in `PanelState`.

**OpenAI non-streaming (cloud, `model === "openai"`, non-streaming panel):**

1. `ChatPanel` (non-streaming) calls `useNonStreamingChat.sendMessage` → `src/lib/api.ts` `fetchChat(message)`.
2. `fetchChat` POSTs to `/api/chat`; Vite proxy → `server/index.ts` (`POST /api/chat`).
3. Server calls OpenAI with `stream: false`; returns `200 { content: <text> }`.
4. `fetchChat` returns `{ content, totalTime }`; the hook sets `timeToFirstToken = totalTime` (whole response arrives at once), estimates `tokenCount` via whitespace split, and fills the assistant message in one update.

**Gemma in-browser (WebLLM, `model === "gemma"`):**

1. User clicks "Load Gemma" in `src/components/GemmaLoader.tsx` → `GemmaContext.initEngine()`.
2. `initEngine` dynamically `import("@mlc-ai/web-llm")` (lazy), calls `CreateMLCEngine("gemma-2b-it-q4f32_1-MLC", { initProgressCallback })` storing the engine in `engineRef`. No server/API key involved.
3. Streaming panel: `useStreamingChat` calls `gemma.sendMessage(content, onToken, onComplete, onError, controller)`. Gemma streams async chunks; `timeToFirstToken` and `totalTime` are measured via `performance.now()` in-process (the OpenAI streaming path reports `timeToFirstToken: null` because TTFB is derived client-side in `api.ts`).
4. Non-streaming panel in Gemma mode is unsupported: `useNonStreamingChat` short-circuits with error `"Non-streaming mode with browser-based AI is not supported. Use OpenAI."` (WebLLM only exposes a streaming API).
5. Stop: `AbortController.abort()` + `gemma.stop()` aborts the in-flight WebLLM completion.

**State Management:**

- Per-panel state lives in `PanelState` (`src/types.ts`): `{ id, mode, model, messages, isLoading, isStreaming, metrics, error, controller }`.
- `useStreamingChat(panelId, model)` and `useNonStreamingChat(panelId, model)` each own a `useState<PanelState>` and expose `{ state, sendMessage, stop?, reset }`. `ChatPanel` instantiates both and selects by `mode` prop.
- Gemma engine state is app-wide via React Context (`GemmaProvider` in `src/GemmaContext.tsx`); `useGemma()` is consumed by `useStreamingChat` and `GemmaLoader`. Engine instance held in a `useRef` (not reactive); `ready`/`loadingModel`/`loadProgress` are reactive state.
- Top-level `model` selection is React `useState<ModelMode>` in `src/App.tsx`, passed down to both panels. Panels use a `key={`...-${model}`}` so switching model remounts and resets.

## Key Abstractions

**PanelState (`src/types.ts`):**

- Purpose: Normalized shape for one chat panel's full state (messages, loading flags, metrics, error, abort controller).
- Examples: `src/types.ts`, consumed by `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`, `src/components/ChatPanel.tsx`.
- Pattern: Single discriminated-by-`mode` state object per panel; immutable reducer-style updates.

**ModelMode (`src/types.ts`):**

- Purpose: Selects inference backend — `"openai"` (cloud, server-proxied) vs `"gemma"` (browser WebLLM).
- Examples: `src/types.ts`, `src/App.tsx`, `src/components/ModelSelector.tsx`.
- Pattern: String-literal union driving conditional branching in hooks and panels.

**SSE client parser (`src/lib/api.ts` `streamChat`):**

- Purpose: Hand-rolled Server-Sent-Events reader: decodes the stream, buffers incomplete lines, parses `data:` payloads, handles `[DONE]`, supports `AbortSignal`.
- Examples: `src/lib/api.ts`.
- Pattern: `ReadableStream` reader + `TextDecoder` + line buffer; callback-driven (`onToken`/`onTTFB`/`onComplete`/`onError`).

**GemmaContext (`src/GemmaContext.tsx`):**

- Purpose: App-wide React Context owning the WebLLM engine lifecycle (lazy init, send, stop, progress) so both the loader UI and the streaming hook share one engine.
- Examples: `src/GemmaContext.tsx`, `src/hooks/useStreamingChat.ts`, `src/components/GemmaLoader.tsx`.
- Pattern: Context + Provider + `useRef` for the engine + `useCallback` action methods.

**Chat hooks (`src/hooks/*.ts`):**

- Purpose: Encapsulate streaming vs non-streaming chat logic and state transitions per panel.
- Examples: `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`.
- Pattern: Custom hooks returning `{ state, sendMessage, stop?, reset }`; branch on `model`.

## Entry Points

**Client entry (`src/main.tsx`):**

- Location: `src/main.tsx`
- Triggers: Loaded by `index.html` (`<script type="module" src="/src/main.tsx">`).
- Responsibilities: `createRoot(document.getElementById("root")!")` → render `<GemmaProvider><App /></GemmaProvider>` and import `src/index.css`.

**Server entry (`server/index.ts`):**

- Location: `server/index.ts`
- Triggers: `npm run dev:server` (`tsx watch server/index.ts`) and `npm run build`/`preview` flow; listens on `PORT` (default `3001`).
- Responsibilities: Build the Hono app (CORS, `/api/chat/stream`, `/api/chat`, `/api/health`) and bootstrap with `@hono/node-server`'s `serve({ fetch: app.fetch, port })`.

**App root (`src/App.tsx`):**

- Location: `src/App.tsx`
- Triggers: Rendered by `src/main.tsx`.
- Responsibilities: Hold `model` state, render header + `ModelSelector`, two side-by-side `ChatPanel`s, and `ComparisonSummary`.

## Error Handling

**Strategy:** Fail-soft inline errors surfaced in-panel; no global error boundary. Errors are stored in `PanelState.error` and rendered in `ChatPanel`. Network/abort errors are caught and discriminated from genuine failures.

**Patterns:**

- Server: Missing `OPENAI_API_KEY` → `500 { error: "OPENAI_API_KEY not set on server" }`; upstream OpenAI non-OK → forward error text/status.
- Client `api.ts`: Non-OK HTTP → throw `Error(errData.error ?? "HTTP <status>")`; `AbortError` → treated as completion (not error); malformed SSE chunks are skipped silently.
- Hooks: `useStreamingChat` catches via `onError` callback → `state.error`; `useNonStreamingChat` catches in `try/catch` → `state.error` (fallback `"Unknown error"`).
- Gemma: `initEngine` catches init failures, sets `loadProgress` to `"Failed: <msg>"` and logs to console; `sendMessage` rejects with a clear "Gemma engine not initialized" error if used before load. Gemma non-streaming is explicitly unsupported with a user-facing message.

## Cross-Cutting Concerns

**Logging:** Minimal. Server logs only the listen line (`Hono server listening on http://localhost:${port}`). Client logs Gemma init failures via `console.error` in `src/GemmaContext.tsx`. No structured logger.

**Validation:** None beyond JSON shape access with optional chaining (`data.choices?.[0]?.message?.content`, `parsed.choices?.[0]?.delta?.content`). Input is trimmed and gated on `state.isLoading` before send.

**Authentication:** Server-side only. `OPENAI_API_KEY` is read from `process.env` on the server and never exposed to the client; `.env` is git-ignored (see `.env.example`). Gemma mode requires no key. CORS is open (`app.use("/*", cors())`).

---

_Architecture analysis: 2026-07-10_
