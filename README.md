# ⚡ Streaming Chat Demo

A side-by-side comparison of **streaming** vs **non-streaming** AI chat responses. Measures how streaming improves perceived latency even though total generation time stays similar.

Built with **Hono** + **React** + **TypeScript** + **Tailwind CSS**.

### Modes

| Mode                | Backend                        | Model                  |
| ------------------- | ------------------------------ | ---------------------- |
| **OpenAI (Cloud)**  | Hono proxy → OpenAI API        | `gpt-4o-mini`          |
| **Gemma (Browser)** | None — runs locally via WebGPU | `gemma-2b-it` (WebLLM) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your OpenAI API key (optional — Gemma works without it)
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-...

# 3. Start the dev server (client on :5173, server on :3001)
npm run dev
```

Open **http://localhost:5173** to see the side-by-side comparison.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  ┌──────────────┐  fetch() streaming   ┌──────────┐ │
│  │ React app    │ ──────────────────── │  Hono    │ │
│  │ ReadableStream│    SSE chunks       │  server  │ │
│  │ parser       │ ◄──────────────────── │          │ │
│  │              │                      │          │ │
│  │ WebLLM/Gemma │  (no network — runs  │ OpenAI   │ │
│  │              │   locally via WebGPU) │ API      │ │
│  └──────────────┘                      └──────────┘ │
└─────────────────────────────────────────────────────┘
```

### Streaming Flow

1. User sends a message → `fetch("/api/chat/stream", { signal })`
2. Hono server forwards the request to OpenAI with `stream: true`
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
│   └── index.ts             # Hono backend (proxy + streaming)
├── src/
│   ├── main.tsx             # Entry point (wraps App in GemmaProvider)
│   ├── App.tsx              # Side-by-side layout
│   ├── GemmaContext.tsx     # Shared Gemma engine (React Context)
│   ├── types.ts             # Shared TypeScript types
│   ├── vite-env.d.ts        # Vite type declarations
│   ├── index.css            # Tailwind + custom animations
│   ├── lib/
│   │   └── api.ts           # SSE stream parser + non-streaming fetch
│   ├── hooks/
│   │   ├── useStreamingChat.ts   # Streaming: ReadableStream + AbortController
│   │   └── useNonStreamingChat.ts # Non-streaming: plain fetch → JSON
│   └── components/
│       ├── ChatPanel.tsx        # Chat UI (messages, input, stop button)
│       ├── MetricsBar.tsx       # TTFB / total time / token count
│       ├── ModelSelector.tsx    # OpenAI ↔ Gemma toggle
│       ├── GemmaLoader.tsx      # Load Gemma model button
│       └── ComparisonSummary.tsx # Explanatory cards
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## Scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Start client (Vite) + server (Hono) concurrently |
| `npm run build`     | TypeScript check + Vite production build         |
| `npm run typecheck` | TypeScript type-check only                       |
| `npm run preview`   | Preview production build                         |

## Key Design Decisions

- **Streaming uses incremental state updates** — each token appends to the last message in the array, so the DOM only patches the changed text node rather than re-rendering the full conversation.
- **TTFB is tracked via `performance.now()`** — a `ttftRef` holds the value until the stream completes, then it's committed to state.
- **Stop button is streaming-only** — non-streaming can't be cancelled mid-flight, so the button is hidden in that panel.
- **Gemma runs entirely in the browser** — no API key, no network requests. The model (~1.3 GB) downloads once and persists in memory via a shared React Context.
- **Input stays writable during generation** — users can type their next message while waiting; only the Send button is gated.

## Requirements

- **Node.js** ≥ 18
- **Chrome** with WebGPU support (for Gemma browser mode)
- **OpenAI API key** (for cloud mode — optional)
