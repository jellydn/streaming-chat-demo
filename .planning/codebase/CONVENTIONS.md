# Coding Conventions

**Analysis Date:** 2026-07-11

## Code Style

- **Formatter:** `oxfmt` with 2-space indentation.
- **Linter:** `oxlint` with `no-unused-vars: warn` and `no-console: off`.
- **Quotes:** Double quotes for strings.
- **Semicolons:** Used.

## TypeScript

- Strict mode enabled in both client and server projects.
- Two separate TS projects with project references.
- Client uses `moduleResolution: "bundler"` and `allowImportingTsExtensions: true`.
- Server uses `moduleResolution: "bundler"` and Node types.

## React

- Functional components with named exports.
- Props typed with inline `interface Props`.
- Custom hooks for stateful logic.
- React Context for app-wide Gemma engine state.

## Patterns

- **Adapter pattern** for backends — `ChatBackend` interface with `ServerBackend` and `GemmaBackend`.
- **No barrel exports** — imports reference files directly.
- **Incremental streaming updates** — tokens append to the last message, not full re-renders.
- **AbortController** for cancellation in streaming mode.
- **Shared sentinel** `IDLE_METRICS` for default metrics state.

## Error Handling

- Server returns structured JSON errors.
- Client stores errors in `PanelState.error`.
- `AbortError` treated as completion.

## Imports

- Direct file imports: `from "./types"`, `from "../lib/api"`.
- Type-only imports use `import type`.

---

_Conventions analysis: 2026-07-11_
