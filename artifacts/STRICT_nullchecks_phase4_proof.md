# STRICT_NULLCHECKS_PHASE_4 Proof

## Probe result

- `src/lib/catalog/catalog.transport.ts` was selected because it surfaced 4 local strict-null blockers with a low blast radius.
- `app/pdf-viewer.tsx` remained viable but was rejected as a riskier critical-path viewer slice.
- `src/screens/office/officeHub.sections.tsx` was rejected because it pulled `profile.services`.
- `src/screens/foreman/foreman.manualRecovery.model.ts` was rejected because it pulled multiple cross-domain blockers.
- `src/lib/offline/mutationQueue.ts` was rejected as too wide.

## Before

- Isolated strict-null probe for `src/lib/catalog/catalog.transport.ts`
- Result: 4 local blockers
- Error class:
  - nullable/raw Supabase select rows were not normalized before being promised as domain rows
  - nullable RPC arg omission was shaped as `null` instead of an omitted optional field

## After

- Added `tsconfig.strict-null-phase4-catalog-transport.json`
- Added focused shield:
  - `tests/strict-null/catalog.transport.phase4.test.ts`
- Added pure transport-boundary normalization:
  - `src/lib/catalog/catalog.transport.normalize.ts`
- `catalog.transport.ts` now:
  - filters malformed nullable rows before returning domain arrays
  - preserves valid full-success rows unchanged
  - omits nullable `suppliers_list` search args instead of sending nullable payloads

## Compile proof

- `npx tsc --project tsconfig.strict-null-phase4-catalog-transport.json --pretty false` PASS
- `npx tsc --noEmit --pretty false` PASS

## Regression proof

- Focused phase-4 tests:
  - `npx jest tests/strict-null/catalog.transport.phase4.test.ts src/lib/catalog/catalog.search.service.test.ts --runInBand --no-coverage` PASS
- Full gates:
  - `npx expo lint` PASS
  - `npm test -- --runInBand` PASS
  - `npm test` PASS
  - `git diff --check` pending final re-run after artifact write

## Why runtime semantics are unchanged

- Successful catalog rows keep the same values and same consumer-facing shapes.
- Only malformed nullable transport rows are filtered before they can violate the domain contract.
- `suppliers_list` keeps explicit search text unchanged and only omits the optional arg when the caller intentionally provides `null`.
- No UI flow, role behavior, network routing, permissions, or business calculations changed.

## Release tail

- Pending final commit / push / OTA completion
