# Testing

**Analysis Date:** 2026-07-11

## Current State

**No tests are present in this codebase.**

- No test framework dependency.
- No `test` script in `package.json`.
- No `*.test.*` or `*.spec.*` files.

## Quality Checks

The project relies on static checks and build verification:

- `bun run lint` — `oxlint src server`
- `bun run format:check` — `oxfmt --check .`
- `bun run typecheck` — `tsc -b --noEmit`
- `bun run build` — `tsc -b && vite build`

## CI Pipeline

`.github/workflows/ci.yml` runs the above checks on every push/PR.

## Testing Gaps

- No unit tests for `src/lib/api.ts` SSE parsing.
- No unit tests for `useStreamingChat` / `useNonStreamingChat` state machines.
- No unit tests for `GemmaContext` engine lifecycle.
- No smoke tests for server routes.
- No tests for abort/cancellation behavior.

## Recommended Test Additions

- Add **Vitest** for unit testing React hooks and utilities.
- Add **MSW** (Mock Service Worker) for mocking `/api/chat/stream` and `/api/chat`.
- Add server route tests using **Hono's built-in test helpers**.

---

_Testing analysis: 2026-07-11_
