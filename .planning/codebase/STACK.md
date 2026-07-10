# Technology Stack

**Analysis Date:** 2026-07-10

## Languages

**Primary:**

- TypeScript ~5.7.0 - Whole codebase (client in `src/`, server in `server/index.ts`); strict mode enabled. See `package.json`, `tsconfig.app.json`, `tsconfig.server.json`.
- HTML 5 - Single page shell `index.html` mounting `#root` and loading `/src/main.tsx`.

**Secondary:**

- CSS 3 - Tailwind v4 utility classes plus `src/index.css` custom animations.
- TOML - `oxfmt.toml` formatter config.
- JSON - Config files (`package.json`, `tsconfig*.json`, `.oxlintrc.json`).

## Runtime

**Environment:**

- Node.js - Local v24.18.0 (README requires `>= 18`). Runs the Hono server via `@hono/node-server` and `tsx watch server/index.ts`.
- Browser - Chrome/Chromium with WebGPU for the in-browser Gemma model (WebLLM). React app served by Vite dev server.

**Package Manager:**

- npm 12.0.0 (local) - Scripts in `package.json` use `npm run dev`, `npm run build`, etc.
- Lockfile: present (`package-lock.json`, ~150 KB).

## Frameworks

**Core:**

- React ^19.0.0 - Client UI (`src/App.tsx`, components, hooks); `react-dom` ^19.0.0 renders into `#root` via `src/main.tsx`.
- Hono ^4.7.5 - Node HTTP server/router (`server/index.ts`); uses `@hono/node-server` ^2.0.8 to serve.
- Tailwind CSS ^4.1.4 - Styling via `@tailwindcss/vite` ^4.1.4 plugin (Tailwind v4, no `tailwind.config.js`).

**Testing:**

- None - No test framework or `test` script present (`package.json` has no test dependency).

**Build/Dev:**

- Vite ^6.3.0 - Dev server (`:5173`) and production bundler; `@vitejs/plugin-react` ^4.4.1 for React JSX. See `vite.config.ts`.
- tsx ^4.19.3 - Runs/watches the TypeScript server directly (`tsx watch server/index.ts`).
- concurrently ^9.1.2 - Runs client + server together (`npm run dev`).
- TypeScript ~5.7.0 - Type-checking (`tsc -b`) across two project references.
- oxlint ^1.73.0 - Linter (`oxlint src server`), config in `.oxlintrc.json`.
- oxfmt ^0.58.0 - Formatter (`oxfmt --write .`), config in `oxfmt.toml`.

## Key Dependencies

**Critical:**

- hono ^4.7.5 - HTTP server framework; defines `/api/chat/stream`, `/api/chat`, `/api/health` and CORS middleware (`server/index.ts`).
- @hono/node-server ^2.0.8 - Node adapter that actually binds the Hono app to a port (`serve({ fetch: app.fetch, port })`).
- @mlc-ai/web-llm ^0.2.78 - In-browser LLM engine (WebGPU). Lazy-imported in `src/GemmaContext.tsx` to run `gemma-2b-it-q4f32_1-MLC` fully client-side, no network.
- openai ^4.91.0 - Declared in `dependencies` but the server uses raw `fetch` to `https://api.openai.com/v1/chat/completions` rather than this SDK (see `server/index.ts`); currently unused.
- react ^19.0.0 / react-dom ^19.0.0 - UI rendering and DOM binding.

**Infrastructure:**

- vite ^6.3.0 + @vitejs/plugin-react ^4.4.1 + @tailwindcss/vite ^4.1.4 - Build/dev toolchain and Tailwind v4 integration.
- tailwindcss ^4.1.4 - CSS framework (consumed through the Vite plugin).
- concurrently ^9.1.2 - Parallel dev orchestration of client and server.
- tsx ^4.19.3 - TypeScript execution for the server in dev.
- typescript ~5.7.0 - Static type checking.
- oxlint ^1.73.0 + oxfmt ^0.58.0 - Lint and format.
- @types/node ^26.1.1, @types/react ^19.0.0, @types/react-dom ^19.0.0 - Type definitions.

## Configuration

**Environment:**

- Configured via `.env` (git-ignored); template at `.env.example`.
- Required: `OPENAI_API_KEY` (for cloud/OpenAI mode). Optional: `PORT` (server port, default `3001`).
- Vite dev proxy `/api` -> `http://localhost:3001` with `changeOrigin: true` (`vite.config.ts`).

**Build:**

- `vite.config.ts` - React + Tailwind plugins and dev proxy.
- `tsconfig.json` - Root project with references to `tsconfig.app.json` (compiles `src`, DOM libs, `react-jsx`, `noUnusedLocals`/`noUnusedParameters`) and `tsconfig.server.json` (compiles `server`, `@types/node`, ES2022).
- `.oxlintrc.json` - `no-unused-vars: warn`, `no-console: off`; `.oxlintignore` excludes paths.
- `oxfmt.toml` - 2-space indent.
- `index.html` - Vite entry HTML.

## Platform Requirements

**Development:**

- Node.js >= 18 (local v24.18.0), npm >= (lockfile-generated with 12.0.0).
- Chrome/Chromium with WebGPU enabled for the Gemma browser mode.
- OpenAI API key only needed for cloud mode (Gemma works without it).

**Production:**

- Client: static Vite build served by any static host (`npm run build` -> `dist/`).
- Server: Node process running the Hono app via `@hono/node-server` (default port 3001; behind the Vite proxy or a separate host). No container/Dockerfiles present.

---

_Stack analysis: 2026-07-10_
