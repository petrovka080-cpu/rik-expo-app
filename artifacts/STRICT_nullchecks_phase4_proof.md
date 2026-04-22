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
  - `git diff --check` PASS

## Why runtime semantics are unchanged

- Successful catalog rows keep the same values and same consumer-facing shapes.
- Only malformed nullable transport rows are filtered before they can violate the domain contract.
- `suppliers_list` keeps explicit search text unchanged and only omits the optional arg when the caller intentionally provides `null`.
- No UI flow, role behavior, network routing, permissions, or business calculations changed.

## Release tail

- Runtime commit:
  - `31e1dfd` `TS: strict nullchecks phase 4`
- Push:
  - runtime commit pushed to `origin/main`
- OTA:
  - `development`
    - iOS update group: `ecd6661f-3a13-4758-868b-d36b6ab4bd39`
    - iOS update id: `019db4b4-51dc-7862-82c4-7d2c02b33531`
    - Android update group: `d5246f2e-a35e-4d41-ad5a-38675b9bee50`
    - Android update id: `019db4b4-51dc-7a59-8d47-49988fce7553`
  - `preview`
    - iOS update group: `666a627e-0efe-4389-b495-be3cb36ff0eb`
    - iOS update id: `019db4b8-e461-769d-9956-4b55722c9cca`
    - Android update group: `3a054cd8-4cda-46ef-933c-be40a67286e9`
    - Android update id: `019db4b8-e461-7afa-9fba-c258db08cd1c`
  - `production`
    - iOS update group: `ad4c87b1-2cba-4139-9120-adba7ad5af9a`
    - iOS update id: `019db4bc-9f02-72d2-90d8-32abf9fcbf5f`
    - Android update group: `5b73d556-9462-40fb-8a57-c916874e11c3`
    - Android update id: `019db4bc-9f02-7dc0-91e2-2f6480858895`
- Proof-tail note:
  - release metadata was finalized after the runtime publish in a non-runtime artifact update
