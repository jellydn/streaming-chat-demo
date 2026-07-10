# Welcome to streaming-chat-demo 👋

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)
[![Twitter: jellydn](https://img.shields.io/twitter/follow/jellydn.svg?style=social)](https://twitter.com/jellydn)
![Prerequisite](https://img.shields.io/badge/node-%3E%3D18-blue.svg)
[![CI](https://github.com/jellydn/2026-07-10-ai-chat-stream-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/jellydn/2026-07-10-ai-chat-stream-demo/actions/workflows/ci.yml)

> A side-by-side comparison of **streaming** vs **non-streaming** AI chat responses — measuring how streaming improves perceived latency even though total generation time stays similar.

## 🏠 [Homepage](https://github.com/jellydn/2026-07-10-ai-chat-stream-demo)

### ✨ [Demo](https://2026-07-10-ai-chat-stream-demo-87r7as49y-itman.vercel.app)

## Features

- ⚡️ **Side-by-side comparison** — watch streaming and non-streaming respond to the same prompt at once
- 🌊 **Incremental streaming** — tokens append as they arrive, no full re-render
- ☁️ **Cloud modes** — OpenAI (`gpt-4o-mini`) and OpenRouter (free models) via a Hono proxy
- 💻 **Browser mode** — Gemma runs fully client-side with WebGPU, no API key, no server
- 📊 **Live metrics** — TTFB, total time, and token count per panel
- 🛑 **Stop button** — cancel streaming mid-generation with `AbortController`

## Modes

| Mode                   | Backend                        | Model                                             |
| ---------------------- | ------------------------------ | ------------------------------------------------- |
| **OpenAI** (Cloud)     | Hono proxy → OpenAI API        | `gpt-4o-mini`                                     |
| **OpenRouter** (Cloud) | Hono proxy → OpenRouter API    | `openrouter/free` (auto-selects from free models) |
| **Gemma** (Browser)    | None — runs locally via WebGPU | `gemma-2b-it` (WebLLM)                            |

OpenRouter's `openrouter/free` router auto-selects from available free models — just get an API key and start chatting without OpenAI credits.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your API keys (at least one required for cloud modes)
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-... and/or OPENROUTER_API_KEY=sk-or-v1-...
# Optional: set APP_URL for OpenRouter referrer header (Vercel deployment URL)
# Optional: set OPENROUTER_MODEL to override the default openrouter/free

# 3. Start the dev server (client on :5173, server on :3001)
npm run dev
```

Open **http://localhost:5173** to see the side-by-side comparison.

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  ┌──────────────┐  fetch() streaming  ┌────────────────┐ │
│  │ React app    │ ────────────────── │  Hono server     │ │
│  │ ReadableStream│   SSE chunks      │                  │ │
│  │ parser       │ ◄────────────────── │  OpenAI/OpenRouter│ │
│  │              │                    │  API             │ │
│  │ WebLLM/Gemma │  (no network —     └────────────────┘ │
│  │              │   runs via WebGPU)                     │
│  └──────────────┘                                        │
└──────────────────────────────────────────────────────────┘
```

### Streaming Flow

1. User sends a message → `fetch("/api/chat/stream", { signal, body: { message, provider } })`
2. Hono server dispatches to OpenAI or OpenRouter based on `provider` field
3. Response body is piped back as SSE chunks
4. Frontend reads `ReadableStream` with `getReader()`, parsing `data: ...` lines
5. Each text delta triggers a functional React state update — **incremental, not full re-render**
6. `AbortController.signal` enables the **Stop** button mid-generation

### What Gets Measured

- **TTFB** (Time to First Token) — when the first piece of text appears
- **Total time** — full response duration
- **Token count** — number of deltas received

## Project Structure

```
├── server/
│   ├── app.ts              # Shared Hono app (routes + helpers)
│   └── index.ts            # Node.js dev server entry
├── api/
│   └── [...route].ts       # Vercel serverless entry point
├── src/
│   ├── main.tsx            # Entry point (wraps App in GemmaProvider)
│   ├── App.tsx             # Side-by-side layout
│   ├── GemmaContext.tsx    # Shared Gemma engine (React Context)
│   ├── types.ts            # Shared TypeScript types
│   ├── vite-env.d.ts       # Vite type declarations
│   ├── index.css           # Tailwind + custom animations
│   ├── lib/
│   │   └── api.ts          # SSE stream parser + non-streaming fetch
│   ├── hooks/
│   │   ├── useStreamingChat.ts   # Streaming: ReadableStream + AbortController
│   │   └── useNonStreamingChat.ts # Non-streaming: plain fetch → JSON
│   ├── backends/
│   │   ├── types.ts            # ChatBackend interface
│   │   ├── server.ts           # ServerBackend (OpenAI + OpenRouter)
│   │   ├── gemma.ts            # GemmaBackend (WebLLM adapter)
│   │   └── useBackend.ts       # ModelMode → ChatBackend hook
│   └── components/
│       ├── ChatPanelLayout.tsx  # Pure UI shell (messages, input, metrics)
│       ├── StreamingPanel.tsx   # Streaming-specific composition + GemmaLoader
│       ├── NonStreamingPanel.tsx # Non-streaming composition (no Stop button)
│       ├── MetricsBar.tsx       # TTFB / total time / token count
│       ├── ModelSelector.tsx    # OpenAI / OpenRouter / Gemma toggle
│       ├── GemmaLoader.tsx      # Load Gemma model button
│       └── ComparisonSummary.tsx # Explanatory cards
├── vercel.json             # Vercel deployment config
├── prek.toml               # Local pre-commit hooks
├── Dockerfile              # Dokku/Docker deployment
├── .dockerignore
├── .env.example
├── .github/workflows/ci.yml
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## Scripts

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start client (Vite) + server (Hono) concurrently |
| `npm run build`        | TypeScript check + Vite production build         |
| `npm run typecheck`    | TypeScript type-check only                       |
| `npm run lint`         | Lint with oxlint (`src server`)                  |
| `npm run lint:fix`     | Lint + auto-fix                                  |
| `npm run format`       | Format with oxfmt                                |
| `npm run format:check` | Check formatting (CI)                            |
| `npm run preview`      | Preview production build                         |

## Deployment

### Vercel (recommended)

Deploys from the `vercel.json` config. Frontend served as static files from `dist/`, API routes handled by `api/[...route].ts` as an Edge Function.

```bash
vercel deploy --scope <team> -y --no-wait
```

Set `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY` as Vercel environment variables.

### Dokku / Docker

```bash
docker build -t streaming-chat-demo .
docker run -p 3000:3000 -e OPENROUTER_API_KEY=... streaming-chat-demo
```

For Dokku:

```bash
git remote add dokku dokku@your-server:streaming-chat-demo
git push dokku main
```

### GitHub Actions CI

Every push to `main` runs `.github/workflows/ci.yml`: oxlint → oxfmt → tsc → build.

Use `prek run --all-files` locally to run the same checks before pushing.

## Key Design Decisions

- **Streaming uses incremental state updates** — each token appends to the last message in the array, so the DOM only patches the changed text node rather than re-rendering the full conversation.
- **TTFB is tracked via `performance.now()`** — a `ttftRef` holds the value until the stream completes, then it's committed to state.
- **Stop button is streaming-only** — non-streaming can't be cancelled mid-flight, so the button is hidden in that panel.
- **Gemma runs entirely in the browser** — no API key, no network requests. The model (~1.3 GB) downloads once and persists in memory via a shared React Context.
- **Input stays writable during generation** — users can type their next message while waiting; only the Send button is gated.
- **Provider dispatch** — the server dispatches to OpenAI or OpenRouter based on the `provider` field. Each provider has its own config: base URL, auth headers, and model name.

## Requirements

- **Node.js** ≥ 18
- **Chrome** with WebGPU support (for Gemma browser mode)
- **OpenAI API key** or **OpenRouter API key** (for cloud modes — optional; Gemma works without either)

## Author

👤 **Huynh Duc Dung**

- Website: https://productsway.com/
- Twitter: [@jellydn](https://twitter.com/jellydn)
- Github: [@jellydn](https://github.com/jellydn)

## Show your support

[![kofi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/dunghd)
[![paypal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/dunghd)
[![buymeacoffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dunghd)

Give a ⭐️ if this project helped you!

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://productsway.com/"><img src="https://avatars.githubusercontent.com/u/870029?v=4?s=100" width="100px;" alt="Huynh Duc Dung"/><br /><sub><b>Huynh Duc Dung</b></sub></a><br /><a href="https://github.com/jellydn/2026-07-10-ai-chat-stream-demo/commits?author=jellydn" title="Code">💻</a> <a href="https://github.com/jellydn/2026-07-10-ai-chat-stream-demo/commits?author=jellydn" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
