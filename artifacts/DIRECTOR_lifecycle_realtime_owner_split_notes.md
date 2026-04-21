# DIRECTOR lifecycle realtime owner split notes

## Initial ownership map

Before this wave `src/screens/director/director.lifecycle.ts` still owned several concerns at once:

- refresh cooldown and rerun discipline
- visible-scope and tab/period scope key derivation
- AppState/web/focus refresh planning
- realtime channel bootstrap and teardown wiring
- raw Supabase channel setup for director screen lifecycle
- orchestration between refresh owners and realtime owners

This made the hook a residual god-owner even after the earlier Director domain cleanup.

## Exact extracted modules

The wave split the remaining owner boundary into exact-scope modules:

- `src/screens/director/director.lifecycle.contract.ts`
  Thin type boundary shared by lifecycle modules.
- `src/screens/director/director.lifecycle.scope.ts`
  Pure scope-key builders, visible refresh planning, and realtime payload predicates.
- `src/screens/director/director.lifecycle.refresh.ts`
  Refresh owner discipline: cooldown, rerun, tab-switch plan, web resume plan, focus-return plan.
- `src/screens/director/director.lifecycle.realtime.ts`
  Realtime execution owner: channel setup, handoff channel wiring, teardown/error observability.

## What stayed in the orchestrator

`src/screens/director/director.lifecycle.ts` intentionally remains the thin orchestration hook. It now keeps:

- bootstrap/init effect wiring
- tab and period change orchestration
- AppState, focus-return, and web-resume effect hooks
- integration with extracted refresh and realtime owners
- final side-effect execution and refresh reason recording

## Semantics intentionally unchanged

The wave did not change:

- Director screen public hook contract
- finance and reports business semantics
- refresh source-of-truth semantics
- realtime channel names and bindings
- access control or auth semantics
- PDF/business flows outside the exact director lifecycle boundary

## Auto-fixes completed inside exact scope

- Removed the old lifecycle entry-file `eslint-disable` by replacing it with stable ref-based wiring.
- Kept the touched runtime scope free of `as any`, `@ts-ignore`, `catch {}`, and temporary adapters.

## Intentionally not touched

- `src/screens/director/director.finance.realtime.lifecycle.ts`
- `src/screens/director/director.reports.realtime.lifecycle.ts`
- Director finance/report business fetch implementations
- Office/auth/navigation domains outside the exact director lifecycle boundary

## Residual risk left outside this wave

- Native runtime proof environment became noisy after one Android verifier recovery attempt. That was classified as `BLOCKED` rather than treated as app-code failure.
- The historical `/director` web verifier path is stale; the live web proof for this wave used the current production route `/office/director`.
