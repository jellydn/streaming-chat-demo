# Codebase Concerns

**Analysis Date:** 2026-07-10

## Tech Debt

**Dead `onMetricsChange` prop on ChatPanel:**

- Issue: `ChatPanel` declares `onMetricsChange?: () => void` in its `Props` interface but never destructures or calls it; the prop is silently ignored by every caller (`src/components/ChatPanel.tsx:12`, destructure at `src/components/ChatPanel.tsx:15`).
- Files: `src/components/ChatPanel.tsx`
- Impact: Dead API surface that misleads readers into thinking metrics changes propagate upward; no functionality lost, but it is misleading cruft.
- Fix approach: Delete the unused prop from the `Props` interface (and from any caller passing it). Quick cleanup.

**Duplicated code across server, client hook, SSE parser, and App layout:**

- Issue: (a) The two server handlers in `server/index.ts` duplicate the OpenAI `fetch` + auth-header + key-check boilerplate (lines `11-40` streaming vs `43-68` non-streaming). (b) `src/lib/api.ts` repeats the literal `onComplete({ timeToFirstToken: null, totalTime, tokenCount })` object three times (lines `59-63`, `85-89`, `92-96`). (c) The `PanelState` initial-state literal is duplicated inside the same hook in both the `useState` initializer and the `reset` callback in `src/hooks/useStreamingChat.ts` (lines `7-17` and `110-120`) and `src/hooks/useNonStreamingChat.ts` (lines `6-16` and `76-86`). (d) The two panel wrapper `<div>`s in `src/App.tsx` are near-identical (lines `31-43` and `46-58`).
- Files: `server/index.ts`, `src/lib/api.ts`, `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`, `src/App.tsx`
- Impact: Five separate copies of the `PanelState` shape mean a type change silently drifts; server handlers can diverge in error handling; harder to maintain.
- Fix approach: Extract a `createInitialPanelState(id, mode, model)` factory; extract a shared `buildOnCompleteMetrics()`; factor the server request into a helper. Introduce a `PanelShell` component for the duplicated wrapper.

**Stale/unreliable documentation (AGENTS.md + README.md):**

- Issue: `AGENTS.md` states `.gitignore` is empty and "node_modules, .env, and dist are not ignored" — false (the file correctly ignores all three; see Security). `AGENTS.md` also claims "There is no `lint` or `test` script" — false (`package.json` has `lint`/`lint:fix` via `oxlint` and `format`/`format:check` via `oxfmt`). `README.md:105` claims "Input stays writable during generation" — contradicted by `readOnly` in `ChatPanel.tsx:111` (see Known Bugs).
- Files: `AGENTS.md`, `README.md`
- Impact: Onboarding instructions are wrong; new agents may waste time "fixing" a non-issue or trust a convention that doesn't hold.
- Fix approach: Regenerate AGENTS.md from current state; correct the README input claim.

**Unused `openai` dependency:**

- Issue: `openai@^4.91.0` is listed under `dependencies` but the server talks to OpenAI via raw `fetch` (`server/index.ts:19`, `51`); the SDK is never imported.
- Files: `package.json`, `server/index.ts`
- Impact: Unnecessary install weight and a dependency to keep patched; suggests an unfinished refactor.
- Fix approach: Remove `openai` from `dependencies`, or actually adopt it for cleaner error handling.

## Known Bugs

**Gemma Stop button does not cancel generation (and neither does Reset):**

- Symptoms: Clicking "Stop" in Gemma streaming mode updates the UI (loading stops) but the model keeps emitting tokens; the browser keeps running inference and `onToken` still fires into an already-reset panel.
- Files: `src/GemmaContext.tsx` (`sendMessage` lines `85-110`, `stop` lines `132-134`), `src/hooks/useStreamingChat.ts` (`stop` lines `95-106`, `reset` lines `108-121`)
- Trigger: Select Gemma mode, Load Gemma, send a message, click Stop (or the ↺ reset) mid-generation.
- Workaround: None functional; the only way to truly stop is to reload the page. Reason: `sendMessage` only races the _creation_ promise via `Promise.race([completion, abortPromise])` (`src/GemmaContext.tsx:96`). Once `completion` resolves to the `AsyncIterable`, the `for await ... of chunks` loop (`src/GemmaContext.tsx:98-110`) runs unraced, and `engine.interruptGenerate()` is never called. `stop()` only calls `currentControllerRef.current?.abort()` (`src/GemmaContext.tsx:133`), which merely rejects the now-orphaned race. `reset` (`src/hooks/useStreamingChat.ts:109`) calls `controller.abort()` but not `gemma.stop()`, so Gemma generation is likewise not interrupted.
- Fix approach: Call `engineRef.current.interruptGenerate()` inside `stop()` (the `MLCEngine` API exposes it), and keep the abort signal wired through the iteration so the loop throws on abort.

**Gemma (browser) mode has no working non-streaming path — half the demo premise is undelivered:**

- Symptoms: In Gemma mode the right-hand "Non-Streaming" panel shows only the error "Non-streaming mode with browser-based AI is not supported. Use OpenAI." instead of a response.
- Files: `src/hooks/useNonStreamingChat.ts` (lines `33-41`)
- Trigger: Select Gemma mode, type in the Non-Streaming panel, send.
- Workaround: Switch to OpenAI mode for the comparison; the side-by-side streaming-vs-non-streaming comparison is therefore only meaningful in cloud mode.
- Why it matters: The app's central premise (compare streaming vs non-streaming side-by-side) is only half-delivered for the browser backend. The limitation is undocumented in `README.md`/`AGENTS.md`. Note WebLLM always streams, so a real non-streaming Gemma run requires buffering the full completion and timing it — feasible but not implemented.
- Fix approach: Implement Gemma non-streaming by awaiting the full streamed result, measuring `totalTime`, and displaying it; or explicitly document the limitation in the UI/README.

**Non-streaming metrics are misleading (word count tokens + fake TTFB):**

- Symptoms: The non-streaming panel reports `timeToFirstToken` equal to `totalTime` and a `tokenCount` derived from word count, which is inconsistent with the streaming panel (which counts deltas) and semantically wrong for a mode that has no first-token event.
- Files: `src/hooks/useNonStreamingChat.ts` (line `52` word split; line `58` `timeToFirstToken: totalTime`)
- Trigger: Any non-streaming OpenAI response.
- Workaround: None; displays are simply misleading for cross-panel comparison.
- Fix approach: For non-streaming, set `timeToFirstToken: null` (no first-token event) and either count actual tokens via a tokenizer or label the metric "words" consistently; align units with the streaming panel.

**ChatPanel input is read-only during generation, contradicting documented convention:**

- Symptoms: While a response is loading, the text input is `readOnly` (and `disabled` when Gemma isn't loaded). Users cannot type their next message during generation.
- Files: `src/components/ChatPanel.tsx` (`readOnly={state.isLoading && !isBlocked}` line `111`; `disabled={isBlocked}` line `110`)
- Trigger: Send any message; observe the input is not editable until completion.
- Workaround: None in-UI.
- Why it matters: `README.md:105` and `AGENTS.md` both state "input stays editable during generation; only the Send button is gated." The code does the opposite, so a documented UX advantage is not actually shipped.
- Fix approach: Remove `readOnly`/`disabled` from the input (keep Send gated via `canSubmit`/`isBlocked`), matching the documented behavior.

**Server does not propagate client abort to the upstream OpenAI request:**

- Symptoms: Clicking Stop in OpenAI streaming mode aborts the client's `fetch` and closes the pipe, but the server-to-OpenAI `fetch` (`server/index.ts:19-30`) is created without an `AbortSignal`, so the upstream request keeps streaming until completion and the server writes to a closed `s` (lines `37-39`).
- Files: `server/index.ts` (lines `19-39`)
- Trigger: Start an OpenAI stream, click Stop.
- Workaround: None; minor wasted bandwidth/compute on the server.
- Fix approach: Pass the incoming request's `AbortSignal` (`c.req.raw.signal`) into the upstream `fetch` options.

**SSE parser ignores streamed TTFB in the returned metrics object:**

- Symptoms: `streamChat`'s `onComplete` always hardcodes `timeToFirstToken: null` (`src/lib/api.ts:59`, `86`, `92`). The real TTFB only survives because `useStreamingChat` keeps a separate `ttftRef` (`src/hooks/useStreamingChat.ts:19`, `64`). This dual-source-of-truth is fragile and the `null` literals are misleading.
- Files: `src/lib/api.ts`, `src/hooks/useStreamingChat.ts`
- Trigger: Any streaming response.
- Workaround: N/A (works today via the ref).
- Fix approach: Have `streamChat` carry the captured TTFB through to `onComplete` instead of hardcoding `null`.

## Security Considerations

**CORS enabled for all origins:**

- Risk: `server/index.ts:8` registers `app.use("/*", cors())` with default options, i.e. `Access-Control-Allow-Origin: *` (and reflecting any origin). Any website can call the demo's `/api/chat` endpoints from a visitor's browser, leaking the server's OpenAI usage and burning the operator's `OPENAI_API_KEY`.
- Files: `server/index.ts`
- Current mitigation: None — the route is fully open. (Acceptable only if the server is bound to `localhost` and never exposed.)
- Recommendations: Restrict CORS to `http://localhost:5173` (the Vite dev origin) or disable it entirely behind the Vite proxy; avoid exposing port 3001 publicly. Note the OpenAI calls are server-side proxied, so the key never reaches the browser — good — but the open CORS still allows abuse of that proxy.

**API key handling:**

- Risk: `OPENAI_API_KEY` is read from `process.env` on the server (`server/index.ts:13`, `45`). Correct placement (never shipped to client). The only exposure vector is the open CORS above plus an untrusted network.
- Files: `server/index.ts`
- Current mitigation: Key is server-only; missing key returns a 500 with a clear message (lines `15-17`, `47-49`).
- Recommendations: Add a `.env.example` check, consider a per-IP rate limit, and ensure `.env` is never committed (it is already git-ignored — see below).

**.gitignore is actually correct (premise #8 is FALSE — documented here for traceability):**

- Risk: Claimed as missing/empty, but verified present and correct: `node_modules/`, `dist/`, `.env`, `.vscode/`, `.idea/`, `.DS_Store`, `*.log`, `/tmp/`, `*.tsbuildinfo` are all ignored (`/.gitignore` lines `1-23`). `git ls-files` shows `.gitignore` is tracked and `git status` reports a clean tree.
- Files: `.gitignore`
- Current mitigation: Secrets and build output are properly excluded from version control.
- Recommendations: No action needed for `.gitignore`. Update `AGENTS.md` (which falsely states it is empty) to prevent future confusion.

## Performance Bottlenecks

**Per-token `setState` re-maps the entire messages array:**

- Problem: `handleToken` (`src/hooks/useStreamingChat.ts:40-47`) clones `prev.messages` and rewrites the last message on _every_ delta. For fast local Gemma generation (many small tokens/sec) this is O(messages) work per token and triggers a React re-render per token.
- Files: `src/hooks/useStreamingChat.ts`, `src/components/ChatPanel.tsx`
- Cause: State shape stores the full `messages` array; each append forces a full-array copy + reconciliation.
- Improvement path: Batch tokens via `requestAnimationFrame`/throttle, or use a ref + imperative DOM append for the streaming message; consider a reducer that mutates only the tail message.

**Local Gemma model memory/compute footprint:**

- Problem: `gemma-2b-it-q4f32_1-MLC` (~1.3 GB) is loaded fully into GPU/CPU memory via WebLLM (`src/GemmaContext.tsx:43`). On machines without WebGPU or with limited VRAM it fails or is extremely slow; there is no fallback.
- Files: `src/GemmaContext.tsx`
- Cause: In-browser inference is hardware-bound.
- Improvement path: Surface capability detection up front; allow selecting a smaller/quantized model; show estimated memory before download.

**Server-side: unbounded upstream streaming with no backpressure control:**

- Problem: `s.pipe(response.body!)` (`server/index.ts:38`) blindly forwards bytes; with the abort-not-propagated bug above, cancelled clients still drive a full upstream completion.
- Files: `server/index.ts`
- Cause: Passthrough proxy without cancellation.
- Improvement path: Wire abort signal (see Known Bugs) and add a sane upstream timeout.

## Fragile Areas

**GemmaContext abort/interrupt contract:**

- Files: `src/GemmaContext.tsx`
- Why fragile: The abort handling is split between a one-shot `Promise.race` on creation and an unraced iteration; `interruptGenerate` is never called. Any change to `sendMessage` is likely to reintroduce the "Stop doesn't work" bug. The engine ref is typed `any` (`src/GemmaContext.tsx:28`), hiding the real interrupt API.
- Safe modification: Keep the abort wired across the whole loop; add a `stop()` that calls `engine.interruptGenerate()`; type the engine against `@mlc-ai/web-llm`'s `MLCEngine` instead of `any`.
- Test coverage: None (no tests exist).

**ChatPanel couples both chat hooks unconditionally:**

- Files: `src/components/ChatPanel.tsx` (`useStreamingChat` + `useNonStreamingChat` both instantiated at lines `16-17` regardless of `mode`)
- Why fragile: The panel always mounts _both_ hooks; `nonStreaming.gemmaReady` is `undefined` for the non-streaming branch (line `24`) and the streaming `stop` is used even in non-streaming mode (line `23`), so the Stop button visibility relies on the `mode === "streaming"` guard at line `123`. A refactor that swaps hooks risks breaking the Stop/Reset wiring.
- Safe modification: Select the hook by `mode` once, or split into `StreamingChatPanel`/`NonStreamingChatPanel`.
- Test coverage: None.

**Duplicated `PanelState` literals:**

- Files: `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`
- Why fragile: Five copies of the same literal (see Tech Debt); adding a field to `PanelState` (`src/types.ts:16-26`) requires editing each copy by hand.
- Safe modification: Central `createInitialPanelState()` factory imported by both hooks.
- Test coverage: None.

## Scaling Limits

**Server concurrency / rate limiting:**

- Current capacity: Single Node process, one OpenAI `fetch` per request, no concurrency cap, no rate limit, no request timeout.
- Limit: Under many concurrent users the operator's `OPENAI_API_KEY` quota is exhausted and the server has no backpressure; no health-based throttling.
- Scaling path: Add a request queue/rate limiter, upstream timeout, and (if needed) horizontal scaling behind a load balancer — but note the in-browser Gemma path scales with the client, not the server.

**Single shared Gemma engine instance:**

- Current capacity: One `engineRef` (`src/GemmaContext.tsx:28`) shared via React Context across both panels.
- Limit: Only one model in memory; multiple tabs each download ~1.3 GB separately (no cross-tab cache). No model warm pool.
- Scaling path: Acceptable for a demo; for broader use, consider a Web Worker boundary and a service/shared cache.

**Token/word-count metric fidelity:**

- Current capacity: Streaming counts deltas; non-streaming counts words (misleading, see Known Bugs).
- Limit: Cross-panel "tokens" numbers are not comparable, undermining the demo's measurement premise at any scale.
- Scaling path: Use a real tokenizer (e.g. `openai` TikToken or WebLLM's tokenizer) consistently on both paths.

## Dependencies at Risk

**`@mlc-ai/web-llm` (pinned `^0.2.78`):**

- Risk: Fast-moving experimental library; WebGPU/Chrome-only. API surface (e.g. `interruptGenerate`, model id strings) can change between minor versions; a broken release could break the entire Gemma path.
- Impact: The browser mode is entirely dependent on it; no fallback model/provider.
- Migration plan: Pin an exact version and add a smoke test; if abandoned, alternatives are limited (still WebGPU/llama.cpp-wasm class libs).

**`openai` SDK listed but unused:**

- Risk: Dead dependency kept at `^4.91.0`; if it drifts it adds patch burden for zero benefit, and suggests an abandoned refactor path.
- Impact: None functional today, but misleading and a maintenance tax.
- Migration plan: Remove it (recommended) or actually use it in `server/index.ts`.

**No lockfile-driven reproducibility concern:**

- Risk: `package-lock.json` exists (per STACK.md), but `tsx watch` + Vite dev with `@types/node ^26` on a Node 24 runtime can pull newer transitive types than CI; minor.
- Impact: Low.
- Migration plan: Keep `npm ci` in any future CI.

## Missing Critical Features

**Working Gemma non-streaming comparison:**

- Problem: The right-hand non-streaming panel is non-functional in Gemma mode (hard error), so the app's headline "streaming vs non-streaming side-by-side" comparison only works in OpenAI mode.
- Blocks: Demonstrating the perceived-latency thesis for the browser backend; the README's own diagram implies both panels work in both modes.

**Real first-token metric for OpenAI streaming:**

- Problem: `streamChat` throws away TTFB in its returned metrics (hardcoded `null`); correctness depends on an out-of-band `ttftRef`. Not a missing feature per se, but the public `Metrics` contract is not honored by the parser.
- Blocks: Any consumer that trusts `onComplete`'s `timeToFirstToken` directly.

**Abort propagation + engine interrupt:**

- Problem: Stop/Reset do not actually halt inference for Gemma (and do not cancel the upstream OpenAI request). See Known Bugs.
- Blocks: A usable "Stop" experience; correctness of metrics after early termination.

**Capability detection / graceful degradation:**

- Problem: No WebGPU feature check before offering Gemma; failures only surface as a console error (`src/GemmaContext.tsx:52`).
- Blocks: Usable experience on unsupported browsers.

## Test Coverage Gaps

**Entire codebase is untested:**

- What's not tested: No `*.test.*`/`*.spec.*` files exist anywhere in the repo; `package.json` has no `test` script and no test runner dependency. SSE parsing, hook state machines, metric math, abort handling, and the Gemma `interruptGenerate` fix are all unverified by automation.
- Files: `src/lib/api.ts`, `src/hooks/useStreamingChat.ts`, `src/hooks/useNonStreamingChat.ts`, `src/GemmaContext.tsx`, `server/index.ts`
- Risk: The exact bugs listed above (Gemma Stop, misleading metrics, readOnly input) could regress silently; no safety net for the duplicated `PanelState` refactor.
- Priority: High — at minimum add unit tests for `streamChat` SSE parsing and the hook metric/abort logic, plus a server route smoke test.

**Lint config not enforced in CI:**

- What's not tested: `oxlint`/`oxfmt` exist (`package.json` `lint`, `lint:fix`, `format:check`) but there is no CI workflow to run them, so the unused `onMetricsChange` prop and the unused `openai` dep were never flagged.
- Files: `package.json`, `.oxlintrc.json`
- Risk: Dead code and style drift accumulate (as already seen).
- Priority: Medium — wire `typecheck` + `lint` into a pre-commit/CI check.

---

_Concerns audit: 2026-07-10_
