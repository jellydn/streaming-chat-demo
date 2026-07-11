# External Integrations

**Analysis Date:** 2026-07-11

## APIs & External Services

### OpenAI Chat Completions API

- **Purpose:** Cloud mode for streaming and non-streaming chat.
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Model:** `gpt-4o-mini`
- **Auth:** `OPENAI_API_KEY` (server-side env var).
- **Files:** `server/app.ts`

### OpenRouter Chat Completions API

- **Purpose:** Free-model cloud mode.
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Model:** `openrouter/free` (default; override via `OPENROUTER_MODEL`).
- **Auth:** `OPENROUTER_API_KEY` (server-side env var).
- **Headers:** `HTTP-Referer`, `X-Title`.
- **Files:** `server/app.ts`

### WebLLM / @mlc-ai/web-llm

- **Purpose:** In-browser Gemma model via WebGPU.
- **Model:** `gemma-2b-it-q4f32_1-MLC` (~1.3 GB).
- **Files:** `src/GemmaContext.tsx`

## Data Storage

- **None** — No database or file storage. Chat state lives in React component/hook state only.

## Authentication & Identity

- **None** — No user login/session. Credentials are server-side env vars only.

## Monitoring & Observability

- **None** — Console logging only.

## CI/CD

- **GitHub Actions** — `.github/workflows/ci.yml` runs lint, format check, typecheck, and build on push/PR.

## Environment Configuration

- `OPENAI_API_KEY` — Required for OpenAI mode.
- `OPENROUTER_API_KEY` — Required for OpenRouter mode.
- `OPENROUTER_MODEL` — Optional override for OpenRouter model.
- `APP_URL` — Optional; used for OpenRouter `HTTP-Referer` header.
- `PORT` — Optional; server port, defaults to `3001`.

---

_Integration audit: 2026-07-11_
