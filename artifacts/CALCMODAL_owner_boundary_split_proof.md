# CALCMODAL Owner Boundary Split Proof

## Before / after boundary proof

Before:

- `CalcModal.tsx` owned normalize + validation + calculation + presenter + RPC orchestration
- inline `catch {}` branches existed in parse/loss paths
- `eslint-disable` comments were used to hold effect/callback wiring together

After:

- normalize/model/validation/state responsibilities live in dedicated pure modules
- `CalcModalContent.tsx` owns rendering only
- `CalcModal.tsx` is reduced to React wiring + orchestration + RPC execution
- exact touched scope no longer contains `catch {}`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`

## Focused tests proving unchanged semantics

Pure layer tests:

- `tests/foreman/calcModal.normalize.test.ts`
  - null/undefined/raw string normalization
  - supported expression sanitizing
  - deterministic formatting
  - valid / empty / invalid parse classification
- `tests/foreman/calcModal.model.test.ts`
  - auto-rule calculation order
  - manual-value precedence
  - RPC payload shaping
  - row mutation helpers
- `tests/foreman/calcModal.validation.test.ts`
  - loss parsing
  - visible field sync
  - parse/validation transitions
  - calculate readiness rules
- `tests/foreman/calcModal.state.test.ts`
  - field partitioning
  - UI-ready state derivation

Owner/presenter regression:

- `tests/foreman/CalcModal.test.tsx`
  - full-success calculate path unchanged
  - invalid numeric input stays visible and blocks RPC
  - back/cancel wiring unchanged

Caller contract regression:

- `src/screens/foreman/ForemanMaterialsContent.sections.test.tsx`
- `src/screens/foreman/ForemanSubcontractTab.sections.test.tsx`

These confirm the modal boundary contract stays compatible for both exact consumers.

## Runtime / semantics proof

What was verified by test contract:

- full-success path still calls `rpc_calc_work_kit` with the same owner-shaped payload semantics
- optional send path still forwards normalized result rows to `onAddToRequest`
- invalid numeric input still surfaces the same visible validation text
- caller modal stacks still mount and wire the modal boundary unchanged

What was not changed:

- user-visible formulas
- rounding semantics
- business ordering
- draft/queue behavior

## Environment note

No emulator/native runtime proof was executed in this environment for this wave. The code proof for this split is based on:

- focused component/integration tests
- unchanged caller contract tests
- full gate suite statuses recorded in the matrix after execution

## Exact gates run

The following gates were executed successfully before the release tail:

```bash
npx tsc --noEmit --pretty false
npx expo lint
npx jest tests/foreman/calcModal.normalize.test.ts tests/foreman/calcModal.model.test.ts tests/foreman/calcModal.validation.test.ts tests/foreman/calcModal.state.test.ts tests/foreman/CalcModal.test.tsx --runInBand --no-coverage
npx jest src/screens/foreman/ForemanMaterialsContent.sections.test.tsx src/screens/foreman/ForemanSubcontractTab.sections.test.tsx --runInBand --no-coverage
npm test -- --runInBand
npm test
git diff --check
```

## Release tail proof

Runtime release commit:

- commit: `e4f5caae3760d43715678f55c22884330b4ec01c`
- message: `Foreman: split calc modal owner boundary`
- pushed to `origin/main`

Guarded OTA publish completed successfully on every required channel:

- `development`
  - iOS update group: `4a7784a0-544d-4d25-80a8-4eb816a342a7`
  - Android update group: `d0d07dd7-abda-4c76-8ee2-7e981319aedb`
- `preview`
  - iOS update group: `e19aad81-a891-4339-b2e5-7f079b6d67df`
  - Android update group: `d2a5bc05-4786-45f0-a12d-78ec1caf3d24`
- `production`
  - iOS update group: `ad4072bc-e395-4b91-ba48-7d43546854ea`
  - Android update group: `b3f16e06-0ebd-4c50-8e0b-e9a110be72a1`

Each OTA publish ran through the guarded release path with the same release message and re-validated:

- `tsc`
- `expo lint`
- `jest --runInBand`
- parallel `jest`
- `git diff --check`
