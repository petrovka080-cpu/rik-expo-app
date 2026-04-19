# P1-A.1 PDF Viewer State Map

Date: 2026-04-19
Baseline: `ae70c11f66d9fe268d7a8ac538995191a0a7a80f`
Scope: `app/pdf-viewer.tsx` only, before P1-A.2 extraction

## Preflight

- `main == origin/main == HEAD`: yes
- Worktree before P1-A: clean
- P0-B/P0-A/P0.CLEAN are committed and pushed
- No active Metro/dev-client/jest/node tails detected
- Off-scope PDF SQL tail was preserved in `stash@{0}` and is not in the P1-A worktree
- No backend/SQL/RPC scope is open for P1-A

## Current Viewer States

The viewer uses `PdfViewerState` from `src/lib/pdf/pdfViewerContract.ts`:

- `init`: type-level state only; current runtime initializes directly from `resolvePdfViewerState`.
- `empty`: no viewer session or no direct snapshot can be resolved.
- `loading`: resolved session/asset exists and render/handoff is in progress.
- `ready`: render/handoff is terminal success.
- `error`: session/resolution/render/timeout/action failure.

## Current State Owners In `app/pdf-viewer.tsx`

- Session/asset state: `session`, `asset`, `syncSnapshot`.
- Terminal state: `state`, `errorText`.
- Render readiness: `isReadyToRender`.
- Native handoff terminal flag: `nativeHandoffCompleted`.
- Retry/reload cycle: `loadAttempt`.
- Web render URI state/ref: `webRenderUri`, `webRenderUriRef`.
- Duplicate/stale suppression refs:
  - `isMountedRef`
  - `renderFailedRef`
  - `readyCommittedRef`
  - `viewerCycleRef`
  - `openSignalSettledRef`
  - `webIframeRenderLoggedKeyRef`
  - `activeRenderInstanceKeyRef`
  - `nativeHandoffGuardRef`
  - `loadingTimeoutGuardRef`
- Timeout refs:
  - `loadingTimeoutRef`
  - `webIframeReadyFallbackRef`

## Current Transition Map

### Bootstrap / Init

Trigger: `useEffect` keyed by `sessionId`, `loadAttempt`, `viewerPlatform`, and callbacks.

Current order:

1. Increment viewer cycle.
2. Reset timing, failure, ready, iframe fallback, loading timeout, web render URI.
3. Reset render/native flags and UI chrome/menu.
4. `syncSnapshot()`.
5. If no session, set `empty`.
6. Touch session and set state from `resolvePdfViewerState`.
7. Resolve PDF source and bootstrap plan.
8. Branch:
   - `show_empty` -> `empty`
   - `show_session_error` -> `error`
   - `show_missing_asset` -> `error`
   - `fail_resolution` -> `markError(..., "resolution")`
   - `start_native_handoff` -> `enterLoading()` then native handoff
   - `show_web_remote_iframe` -> `enterLoading()`, set web URI, schedule iframe fallback
   - `show_embedded_render` -> optional validation, then `isReadyToRender = true`

Pure decision candidate: bootstrap branch planning and cycle reset intent.

Side effects that must stay in viewer for P1-A:

- `touchDocumentSession`
- `failDocumentSession`
- breadcrumbs and critical path events
- validation execution
- `openPdfPreview`
- timeout scheduling/clearing
- object URL revocation

### Loading

Trigger: `enterLoading()`.

Current order:

1. Clear existing loading timeout.
2. `syncSnapshot()`.
3. If no session, set `empty`.
4. Touch session.
5. Set `loading`.
6. Arm timeout guard.
7. Schedule timeout that commits `markError("Document loading timed out.", "timeout")` only if guard accepts the cycle.

Pure decision candidate: `hasSession ? loading : empty`, timeout branch `commit_timeout | stale_skip`.

Side effects that stay in viewer:

- timeout execution
- `touchDocumentSession`
- `markError` side effects

### Ready

Trigger paths:

- Web iframe `onLoad`
- Web iframe fallback timer
- Native WebView `onLoadEnd`
- Native handoff success

Current suppression:

- Skip if `readyCommittedRef.current`
- Skip if `renderFailedRef.current`
- Web/native shell events also pass through `shouldCommitPdfViewerRenderEvent`
- Web fallback also checks mounted, render failure, committed ready, viewer cycle and web URI identity

Current ready side effects:

- clear iframe fallback
- clear loading timeout
- `syncSnapshot`
- clear error
- set `ready`
- touch session
- emit open-visible
- console info
- crash breadcrumb success
- critical path `pdf_render_success`
- critical path `pdf_terminal_success`

Pure decision candidate: `commit_ready | skip_duplicate | skip_after_error | stale_render_event`.

Side effects stay in viewer.

### Error

Trigger paths:

- Bootstrap resolution failure
- Embedded validation failure
- Web iframe `onError`
- Native WebView `onError`
- Native WebView `onHttpError`
- Native handoff failure
- Loading timeout
- Actions hook failures through `markError`

Current behavior:

- Set render-failed ref.
- Clear iframe fallback.
- Clear loading timeout.
- `isReadyToRender = false`.
- Set error text/state.
- Fail session.
- `syncSnapshot`.
- Console error when asset exists.
- Breadcrumb terminal error.
- Critical path render fail for render phase.
- Critical path terminal fail.
- Emit open-failed signal once.

Pure decision candidate: `commit_error | stale_skip`.

Side effects stay in viewer.

### Native Handoff

Trigger paths:

- Primary bootstrap `start_native_handoff`.
- Manual panel action after native handoff completed.

Existing pure planners:

- `planPdfNativeHandoffStart`
- `resolvePdfNativeHandoffDuplicateSkipCommandPlan`
- `resolvePdfNativeHandoffStartCommandPlan`
- `resolvePdfNativeHandoffSuccessTelemetryPlan`
- `planPdfNativeHandoffSuccessCompletion`
- `planPdfNativeHandoffErrorCompletion`
- `resolvePdfNativeHandoffErrorCommandPlan`

Current side effects:

- guard begin/complete
- clear loading timeout
- close menu
- clear error
- set loading
- allow render
- reset native completion
- `openPdfPreview`
- mark ready/error
- breadcrumbs/critical path/console

P1-A must not move `openPdfPreview` or change guard semantics.

### Web Iframe

Trigger paths:

- `show_web_remote_iframe`
- iframe `onLoad`
- iframe `onError`
- fallback timer

Current side effects:

- set/revoke web render URI
- log iframe render/load/error/fallback
- breadcrumbs
- mark ready/error

P1-A shell may render iframe, but orchestration stays in passed callbacks.

## P1-A.2 Extraction Boundary

### Move To `usePdfViewerOrchestrator.ts`

- Local state-machine state:
  - `session`
  - `asset`
  - `state`
  - `errorText`
  - `isReadyToRender`
  - `nativeHandoffCompleted`
  - `loadAttempt`
  - `webRenderUri`
- Suppression refs:
  - mounted
  - render failed
  - ready committed
  - viewer cycle
  - open signal settled
  - web iframe render key
  - active render instance key
  - native handoff guard
  - loading timeout guard
- Pure transition helpers:
  - loading decision
  - ready commit decision
  - render event decision
  - timeout commit decision
- State setters and narrow transition helpers that only update local React state/refs.

### Keep In `app/pdf-viewer.tsx`

- route params and direct snapshot resolution
- actual session touch/fail
- breadcrumbs
- critical path events
- `openPdfPreview`
- action hook
- timeout scheduling/cleanup execution
- web object URL revoke execution
- PDF validation execution
- render-instance key construction
- safe back
- header/menu wiring

### Move To `PdfViewerWebShell.tsx`

- Web iframe body render.
- Props-only event callbacks for load/error.
- No telemetry, no state transitions, no route parsing.
- Generic loading overlay remains in `app/pdf-viewer.tsx` for parity with the existing outer viewer body.

### Move To `PdfViewerNativeShell.tsx`

- Native WebView render.
- Native handoff completed panel render.
- Native handoff loading state render.
- Native unavailable fallback render.
- Props-only event callbacks for load start/load end/error/http error/manual open/share/external.
- No telemetry, no `openPdfPreview`, no state transitions.
- Generic embedded-render loading overlay remains in `app/pdf-viewer.tsx` for parity with the existing outer viewer body.

## P1-A.2 Guardrails

- Do not change business PDF semantics.
- Do not change ready/error order.
- Do not move backend/RPC code.
- Do not mix performance work.
- Do not edit Office/Foreman/AI/queue.
- Do not reintroduce the stashed PDF V2 SQL tail.
- Do not use `--no-verify`.
