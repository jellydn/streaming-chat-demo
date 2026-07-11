# Codebase Structure

**Analysis Date:** 2026-07-11

## Directory Layout

```
2026-07-10-ai-chat-stream-demo/
├── server/                      # Hono backend
│   ├── app.ts                   # Routes + OpenAI/OpenRouter proxy logic
│   └── index.ts                 # Node server entry + static file serving
├── api/
│   └── [...route].ts            # Vercel Edge Function entry
├── src/                         # React client
│   ├── main.tsx                 # DOM entry
│   ├── App.tsx                  # Root layout + model selection
│   ├── GemmaContext.tsx         # WebLLM engine lifecycle
│   ├── types.ts                 # Shared types + IDLE_METRICS
│   ├── index.css                # Tailwind + custom styles
│   ├── lib/
│   │   └── api.ts               # SSE parser + non-streaming fetch
│   ├── backends/
│   │   ├── types.ts             # ChatBackend interface
│   │   ├── server.ts            # ServerBackend
│   │   ├── gemma.ts             # GemmaBackend
│   │   └── useBackend.ts        # ModelMode → ChatBackend
│   ├── components/
│   │   ├── ChatPanelLayout.tsx  # Pure UI shell
│   │   ├── StreamingPanel.tsx
│   │   ├── NonStreamingPanel.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── ComparisonSummary.tsx
│   │   ├── MetricsBar.tsx
│   │   └── GemmaLoader.tsx
│   └── hooks/
│       ├── useStreamingChat.ts
│       └── useNonStreamingChat.ts
├── .planning/codebase/          # Generated docs
├── .github/workflows/ci.yml
├── vercel.json
├── Dockerfile
├── package.json
├── bun.lock
├── vite.config.ts
├── tsconfig*.json
└── README.md
```

## Key File Locations

- **Entry points:** `src/main.tsx`, `server/index.ts`, `api/[...route].ts`
- **Configuration:** `vite.config.ts`, `tsconfig*.json`, `package.json`, `.oxlintrc.json`, `oxfmt.toml`
- **Core logic:** `src/lib/api.ts`, `src/backends/*.ts`, `src/hooks/*.ts`, `server/app.ts`

## Naming Conventions

- **Components:** PascalCase `.tsx` — e.g. `ChatPanelLayout.tsx`
- **Hooks:** camelCase `use*.ts` — e.g. `useStreamingChat.ts`
- **Utilities:** camelCase `.ts` — e.g. `api.ts`
- **Types:** `types.ts` with PascalCase exports
- **Config:** kebab-case — e.g. `vite.config.ts`

## Where to Add New Code

- **New backend:** Add adapter in `src/backends/`, register in `useBackend.ts`.
- **New component:** Add to `src/components/`.
- **New hook:** Add to `src/hooks/`.
- **New server route:** Add to `server/app.ts`.

---

_Structure analysis: 2026-07-11_
