# Codebase Structure

**Analysis Date:** 2026-07-10

## Directory Layout

```
2026-07-10-ai-chat-stream-demo/
├── server/                      # Node/Hono backend (proxy to OpenAI)
│   └── index.ts                 # Hono app: /api/chat/stream, /api/chat, /api/health
├── src/                         # React (Vite) client app
│   ├── components/              # Presentational + container React components
│   │   ├── ChatPanel.tsx        # Side-by-side chat container (uses both hooks)
│   │   ├── ComparisonSummary.tsx# Static streaming vs non-streaming explainer
│   │   ├── GemmaLoader.tsx      # "Load Gemma" button + progress (Gemma mode)
│   │   ├── MetricsBar.tsx       # Live TTFB / total / token metrics display
│   │   └── ModelSelector.tsx    # OpenAI (Cloud) vs Gemma (Browser) toggle
│   ├── hooks/                   # Custom chat state hooks
│   │   ├── useStreamingChat.ts  # Streaming chat state + logic (openai + gemma)
│   │   └── useNonStreamingChat.ts # Non-streaming chat state + logic (openai only)
│   ├── lib/                     # Client-side utilities
│   │   └── api.ts               # SSE parser (streamChat) + fetchChat HTTP client
│   ├── GemmaContext.tsx         # React Context owning WebLLM engine lifecycle
│   ├── App.tsx                  # Root component: layout + model state
│   ├── main.tsx                 # DOM entry point (createRoot + GemmaProvider)
│   ├── types.ts                 # Shared types: ModelMode, Metrics, ChatMessage, PanelState
│   ├── index.css                # Tailwind v4 entry + custom UI styles
│   └── vite-env.d.ts            # Vite client type references
├── .planning/                   # Generated docs (this analysis)
│   └── codebase/                # ARCHITECTURE.md, STRUCTURE.md
├── .env.example                 # Sample env (OPENAI_API_KEY, PORT)
├── .gitignore                   # Ignores node_modules/, dist/, .env, *.tsbuildinfo
├── .oxlintrc.json               # oxlint config
├── .oxlintignore                # oxlint ignore paths
├── oxfmt.toml                   # oxfmt formatter config
├── index.html                   # Vite HTML shell, loads /src/main.tsx
├── package.json                 # Scripts + deps (hono, web-llm, react, vite, oxlint)
├── package-lock.json            # Locked dependency tree
├── README.md                    # Project readme
├── LICENSE                      # License file
├── AGENTS.md                    # Project/agent guidance
├── vite.config.ts               # Vite + React + Tailwind; /api proxy -> :3001
├── tsconfig.json                # Root: project references only
├── tsconfig.app.json            # Client TS project (DOM lib, src/)
├── tsconfig.server.json         # Server TS project (Node types, server/)
├── tsconfig.app.tsbuildinfo     # Build cache (git-ignored)
└── tsconfig.server.tsbuildinfo  # Build cache (git-ignored)
```

## Directory Purposes

**`server/`:**

- Purpose: Backend proxy to the OpenAI Chat Completions API; the only server-side code.
- Contains: `index.ts` (Hono app + `@hono/node-server` bootstrap).
- Key files: `server/index.ts`.

**`src/`:**

- Purpose: The entire React client application.
- Contains: Components, hooks, the Gemma browser-engine context, the SSE/HTTP client lib, shared types, entry point, and styles.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/GemmaContext.tsx`, `src/types.ts`, `src/lib/api.ts`.

**`src/components/`:**

- Purpose: Reusable React UI pieces. `ChatPanel` is the container wiring both chat hooks; the rest are presentational.
- Contains: `*.tsx` components.
- Key files: `src/components/ChatPanel.tsx`, `src/components/MetricsBar.tsx`, `src/components/GemmaLoader.tsx`, `src/components/ModelSelector.tsx`, `src/components/ComparisonSummary.tsx`.

**`src/hooks/`:**

- Purpose: Encapsulate per-panel chat state and behavior for streaming vs non-streaming.
- Contains: `useStreamingChat.ts`, `useNonStreamingChat.ts`.
- Key files: `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`.

**`src/lib/`:**

- Purpose: Framework-agnostic client utilities (networking/SSE parsing).
- Contains: `api.ts` with `streamChat` (SSE reader) and `fetchChat` (JSON POST).
- Key files: `src/lib/api.ts`.

**`.planning/`:**

- Purpose: Generated architecture/structure documentation (this analysis output).
- Contains: `codebase/ARCHITECTURE.md`, `codebase/STRUCTURE.md`.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

## Key File Locations

**Entry Points:**

- `src/main.tsx`: Client DOM entry (`createRoot` + `GemmaProvider`).
- `src/App.tsx`: Root React component (layout + model selection).
- `server/index.ts`: Server entry (`serve({ fetch: app.fetch, port })` on `:3001`).

**Configuration:**

- `vite.config.ts`: Vite/React/Tailwind config and `/api` dev proxy to `:3001`.
- `tsconfig.json`: Root project references (no files compiled directly).
- `tsconfig.app.json`: Client TS config (DOM lib, `src/`, react-jsx, strict).
- `tsconfig.server.json`: Server TS config (Node types, `server/`, ES2022).
- `package.json`: Scripts (`dev`, `build`, `typecheck`, `lint`, `format`) and dependencies.
- `.env.example` / `.gitignore`: Env sample and ignore rules.

**Core Logic:**

- `src/lib/api.ts`: SSE parsing (`streamChat`) and `fetchChat`.
- `src/GemmaContext.tsx`: WebLLM engine init/send/stop via React Context.
- `src/hooks/useStreamingChat.ts` & `src/hooks/useNonStreamingChat.ts`: Chat state machines.
- `src/types.ts`: `ModelMode`, `Metrics`, `ChatMessage`, `PanelState`.

**Testing:**

- None present. There are no test files, no `test`/`vitest` script, and no test directory in this demo. `package.json` provides `lint` (`oxlint`) and `format` (`oxfmt`) but no test runner.

## Naming Conventions

**Files:**

- React components: PascalCase, `.tsx` extension — e.g. `ChatPanel.tsx`, `MetricsBar.tsx`.
- Custom hooks: `use` prefix, camelCase, `.ts` — e.g. `useStreamingChat.ts`.
- Utilities/lib: camelCase, `.ts` — e.g. `api.ts`.
- Context/provider: PascalCase, `.tsx`, name reflects domain — e.g. `GemmaContext.tsx`.
- Types: `types.ts` (single shared module) with PascalCase exported interfaces/types.
- Config: kebab-case — e.g. `vite.config.ts`, `tsconfig.app.json`, `oxfmt.toml`.

**Directories:**

- Feature/role-based, lowercase plural or lowercase noun — `components/`, `hooks/`, `lib/`, `server/`.
- No barrel `index.ts` re-exports; imports reference files directly (e.g. `from "./types"`, `from "../lib/api"`).

**Components & identifiers:**

- Components are named exports (`export function ChatPanel`).
- Props interfaces are local (`interface Props { ... }`).
- State object typed as `PanelState`; mode literal `"streaming" | "non-streaming"`; model literal `"openai" | "gemma"`.

## Where to Add New Code

**New Feature (e.g., a third inference backend or new control):**

- Primary code: add a branch in `src/types.ts` (`ModelMode`/union), wire into `src/App.tsx` and `src/components/ModelSelector.tsx`, and handle in the hooks (`src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`) and `src/GemmaContext.tsx` as needed.
- Tests: none configured — add a test runner (e.g. Vitest) and a `src/**/*.test.ts(x)` file if desired; no convention exists yet.

**New Component/Module:**

- Implementation: `src/components/<ComponentName>.tsx` for UI; `src/hooks/use<Name>.ts` for stateful logic; `src/lib/<name>.ts` for utilities.

**Utilities:**

- Shared helpers: `src/lib/` (client) or top-level helper module; server-only helpers go in `server/` (single `index.ts` today).

## Special Directories

**`dist/`:**

- Purpose: Vite production build output (`npm run build` → `tsc -b && vite build`).
- Generated: Yes (by `vite build`).
- Committed: No (git-ignored in `.gitignore`).

**`node_modules/`:**

- Purpose: Installed npm dependencies.
- Generated: Yes (`npm install`).
- Committed: No (git-ignored in `.gitignore`).

**`.planning/`:**

- Purpose: Documentation/analysis output (this architecture & structure analysis).
- Generated: Yes (by this analysis task).
- Committed: Not currently ignored; up to the user.

**`*.tsbuildinfo` (`tsconfig.app.tsbuildinfo`, `tsconfig.server.tsbuildinfo`):**

- Purpose: Incremental TypeScript build cache for the dual projects.
- Generated: Yes (`tsc -b`).
- Committed: No (git-ignored via `*.tsbuildinfo`).

---

_Structure analysis: 2026-07-10_
