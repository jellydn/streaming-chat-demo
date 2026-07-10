# AGENTS.md

A side-by-side demo comparing **streaming** vs **non-streaming** AI chat. React (Vite) front end, Hono Node back end, TypeScript + Tailwind v4.

## Run it

- `npm run dev` — starts **both** the Vite client (`:5173`) and the Hono server (`:3001`) via `concurrently`. Always use this for cloud mode; running just `vite` leaves `/api` unproxied.
- `npm run typecheck` — type-check via `tsc -b --noEmit`. There is **no** test script in this repo.
- `npm run lint` (`oxlint src server`) / `npm run lint:fix`; `npm run format` (`oxfmt --write .`) / `npm run format:check`. oxlint only enforces `no-unused-vars` (warn) and has `no-console` off — don't expect it to catch much.
- `npm run build` — `tsc -b && vite build`. `npm run preview` serves the production build.

## Three modes (see `ModelMode` in `src/types.ts`)

- **openai** (cloud): client calls `/api/chat/stream` and `/api/chat` with `provider: "openai"`. The Hono server forwards to OpenAI `gpt-4o-mini` and pipes the raw SSE body back. Requires `OPENAI_API_KEY` in `.env`; without it the server returns 500.
- **openrouter** (cloud): same endpoints, `provider: "openrouter"`. Server forwards to OpenRouter's API with the free `OPENROUTER_MODEL` (defaults to `google/gemini-2.0-flash-lite-preview-02-05:free`). Requires `OPENROUTER_API_KEY` in `.env`. Also sends `HTTP-Referer` and `X-Title` headers per OpenRouter conventions.
- **gemma** (browser): runs fully client-side via `@mlc-ai/web-llm` + WebGPU/Chrome — **no server, no API key**. Model `gemma-2b-it-q4f32_1-MLC` (~1.3 GB) is lazy-imported in `src/GemmaContext.tsx` and must be triggered by the in-UI "Load Gemma" button before chatting.

## Architecture gotchas

- Two separate TS projects: `tsconfig.app.json` (compiles `src`, DOM lib, React JSX, `noUnusedLocals`/`noUnusedParameters` on) and `tsconfig.server.json` (compiles `server`, Node types). The root `tsconfig.json` only holds project references. Respect the boundary — server code has no DOM, client code has no Node globals.
- `src/lib/api.ts` hand-rolls the SSE parser (`data: ...` lines, `[DONE]` terminator). The streaming path returns no `timeToFirstToken` (TTFB comes from the client's `performance.now()` instead).
- `dist/` is build output and `.gitignore` correctly ignores `node_modules`, `.env*`, `dist`, and `*.tsbuildinfo`.
- The server dispatches to OpenAI or OpenRouter based on the `provider` field in the request body. `server/app.ts`'s `getConfig()` returns the right base URL, model, and auth headers per provider.

## Conventions

- Streaming uses incremental state updates (each token appends to the last message), not full re-renders. The Stop button (AbortController) is streaming-only.
- Input stays editable during generation; only the Send button is gated.
