# CALCMODAL Owner Boundary Split Notes

## Initial ownership map

`src/components/foreman/CalcModal.tsx` before the wave was a mixed-responsibility owner with five distinct domains in one file:

1. UI/presenter composition
   - modal shell, header, sticky section, footer, result list, row controls
2. Input normalization and parsing
   - expression sanitizing, numeric formatting, invalid input handling
3. Pure calculation / derived field logic
   - `film_m2` auto-fill
   - facade `area_m2` derivation
   - `volume_m3` derivation
   - payload shaping for `rpc_calc_work_kit`
4. Validation and modal-level derived state
   - required key selection
   - `lossPct` parsing
   - multiplier derivation
   - `canCalculate` / `canSend`
5. Owner orchestration
   - React state wiring
   - field sync effects
   - RPC execution
   - add-to-request flow
   - keyboard/toast lifecycle wiring

## Exact root cause

The modal was not just large. It mixed:

- JSX rendering with domain math
- input normalization with validation side effects
- row result editing with RPC orchestration
- field partitioning with owner lifecycle

That made formula-preserving changes riskier than they needed to be and kept validation/calculation logic hard to test outside React.

## Extracted modules

The wave introduced these exact boundary modules:

- `src/components/foreman/calcModal.normalize.ts`
  - expression sanitizing
  - numeric formatting
  - parse classification for empty / invalid / valid inputs
- `src/components/foreman/calcModal.model.ts`
  - row normalization
  - auto-rule derivation
  - RPC payload shaping
  - row quantity mutation helpers
- `src/components/foreman/calcModal.validation.ts`
  - loss parsing / normalization
  - required-key / calculate readiness rules
  - parse-and-apply validation transitions
  - visible field sync
- `src/components/foreman/calcModal.state.ts`
  - field partitioning into core / additional / derived
  - UI-ready modal state derivation
- `src/components/foreman/CalcModalContent.tsx`
  - presenter-only rendering for shell, inputs, results, footer

## What intentionally stayed in CalcModal owner

`src/components/foreman/CalcModal.tsx` now keeps only owner responsibilities:

- React/local state ownership
- keyboard height hook
- toast lifecycle orchestration
- visible/work-type reset discipline
- `useCalcFields(...)` integration
- `rpc_calc_work_kit` execution
- apply/cancel/back/send handlers
- wiring pure modules into the presenter

## Business logic intentionally not changed

This wave did **not** change:

- formulas
- rounding behavior
- order of derived calculations
- RPC contract or payload semantics
- apply/cancel/send behavior
- foreman draft / queue / submit semantics
- caller contract for materials/subcontract modal stacks

## Scope intentionally not touched

Out of scope and intentionally left alone:

- submit pipeline
- queue worker
- RPC / SQL semantics
- durable draft schema
- other foreman controllers or screens
- routing / auth / realtime / PDF
