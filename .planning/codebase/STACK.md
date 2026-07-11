# Technology Stack

**Analysis Date:** 2026-07-11

## Languages

- **TypeScript 6** — Primary language for both client (`src/`) and server (`server/`).
- **HTML 5** — Single-page shell in `index.html`.
- **CSS 3** — Tailwind v4 utility classes plus custom animations in `src/index.css`.

## Runtime

- **Node.js LTS (≥ 18)** — Local development and production server.
- **Browser** — Chrome/Chromium with WebGPU for the in-browser Gemma model.

## Package Manager

- **bun** — Lockfile is `bun.lock`.

## Frameworks & Libraries

- **React 19** — Client UI.
- **Hono 4.7.5** — Node HTTP server/router.
- **Tailwind CSS 4.1.4** — Styling via `@tailwindcss/vite` plugin.
- **@mlc-ai/web-llm 0.2.78** — In-browser WebLLM engine for Gemma.

## Build & Tooling

- **Vite 8** — Dev server and production bundler.
- **@vitejs/plugin-react 6** — React JSX transform.
- **tsx 4.19.3** — TypeScript execution for the server in dev.
- **concurrently 10** — Runs client + server together.
- **typescript 6** — Type-checking across two project references.
- **oxlint 1.73.0** — Linter.
- **oxfmt 0.58.0** — Formatter.

## Configuration

- `vite.config.ts` — Vite + React + Tailwind; `/api` proxy to `:3001`.
- `tsconfig.json` — Root project references.
- `tsconfig.app.json` — Client TS project (DOM lib, `src/`, react-jsx, strict).
- `tsconfig.server.json` — Server TS project (Node types, `server/`).
- `.oxlintrc.json` — `no-unused-vars: warn`, `no-console: off`.
- `oxfmt.toml` — 2-space indent.
- `vercel.json` — Vercel deployment config.
- `Dockerfile` — Docker/Dokku deployment.

## Deployment

- **Vercel** — Frontend static files + Edge Function in `api/[...route].ts`.
- **Docker/Dokku** — Node container running Hono server + static files.

---

_Stack analysis: 2026-07-11_
