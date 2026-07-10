# External Integrations

**Analysis Date:** 2026-07-10

## APIs & External Services

**LLM / Chat Completion APIs:**

- OpenAI Chat Completions API - Used in cloud mode. The Hono server forwards requests to `https://api.openai.com/v1/chat/completions` with model `gpt-4o-mini`, both streaming (`stream: true`) and non-streaming (`stream: false`) variants. See `server/index.ts` (`/api/chat/stream`, `/api/chat`).
- SDK/Client: raw `fetch` (the `openai` ^4.91.0 package is declared in `dependencies` but not actually imported — server uses native `fetch`). Client-side SSE parsed by hand in `src/lib/api.ts`.
- Auth: `OPENAI_API_KEY` (server-side env var, sent as `Authorization: Bearer <key>`).

**In-Browser Model Runtime:**

- WebLLM / @mlc-ai/web-llm - Runs `gemma-2b-it-q4f32_1-MLC` entirely in the browser via WebGPU. Lazy-imported in `src/GemmaContext.tsx` (`initEngine`); model (~1.3 GB) downloads once then persists in memory. No network calls, no API key.
- SDK/Client: `@mlc-ai/web-llm` ^0.2.78 (`CreateMLCEngine`), invoked through the OpenAI-compatible `engine.chat.completions.create({ stream: true })` interface.

## Data Storage

**Databases:**

- None - No SQL/NoSQL database, ORM, or client. Chat state is held in React component/hook state only.

**File Storage:**

- Local filesystem only - No cloud object storage. The Gemma model weights are cached by the WebLLM runtime in the browser (IndexedDB/cache), not on the server.

**Caching:**

- None (server-side) - The Hono server is stateless and pipes OpenAI responses through. On the client, the loaded Gemma engine is cached in a `useRef` inside `GemmaContext.tsx` for the session lifetime.

## Authentication & Identity

**Auth Provider:**

- None (no user identity) - There is no user login/session system.
- Implementation: The only credential is the server-side `OPENAI_API_KEY` env var used to call OpenAI. No per-user auth tokens or cookies. CORS is wide open (`app.use("/*", cors())` in `server/index.ts`).

## Monitoring & Observability

**Error Tracking:**

- None - No Sentry/Datadog/etc.

**Logs:**

- Console only - `console.error`/`console.log` calls in `server/index.ts` and `src/GemmaContext.tsx`; `no-console` lint rule is disabled in `.oxlintrc.json`.

## CI/CD & Deployment

**Hosting:**

- Local / self-hosted - Dev runs via `npm run dev` (Vite `:5173` + Hono `:3001`). No cloud platform config (no Dockerfile, no `vercel.json`/`netlify.toml`). Client builds to static `dist/`, server runs as a plain Node process.

**CI Pipeline:**

- None - No GitHub Actions or other CI configuration present.

## Environment Configuration

**Required env vars:**

- `OPENAI_API_KEY` - Required only for OpenAI/cloud mode (Gemma browser mode works without it). Validated at request time in `server/index.ts` (returns 500 `OPENAI_API_KEY not set on server` if missing).
- `PORT` - Optional; server port, defaults to `3001` (`server/index.ts`).

**Secrets location:**

- `.env` file at project root (git-ignored per `.gitignore`). Template provided in `.env.example`. No secrets manager or vault.

## Webhooks & Callbacks

**Incoming:**

- None - The server exposes only `POST /api/chat/stream`, `POST /api/chat`, and `GET /api/health`; no webhook receivers.

**Outgoing:**

- None - No outbound webhooks. The only outbound calls are to the OpenAI Chat Completions API (server-side) and the WebLLM model download (client-side, from the WebLLM CDN).

---

_Integration audit: 2026-07-10_
