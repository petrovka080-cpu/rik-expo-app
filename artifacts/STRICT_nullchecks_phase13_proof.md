# STRICT_NULLCHECKS_PHASE_13 Proof

## Probe Result

Read-only isolated probes found:

- `contractor.workProgressSubmitFlow.ts` — 2 strict-null blockers on a submit-process boundary, but no active external caller in the current graph.
- `contractor.search.ts` — 4 strict-null blockers in the active contractor material search RPC-output mapper.
- `OfficeHubScreen.tsx` — promise contract drift across shared office loader state; blocked by shared deps.
- `foreman.draftLifecycle.model.ts` — nullable snapshot blockers plus imported shared blockers; too wide for Phase 13.

Chosen slice: `src/screens/contractor/contractor.search.ts`.

## Before Blocker List

```text
src/screens/contractor/contractor.search.ts(32,18): error TS18048: 'a.available' is possibly 'undefined'.
src/screens/contractor/contractor.search.ts(33,18): error TS18048: 'b.available' is possibly 'undefined'.
src/screens/contractor/contractor.search.ts(35,45): error TS18048: 'b.available' is possibly 'undefined'.
src/screens/contractor/contractor.search.ts(35,59): error TS18048: 'a.available' is possibly 'undefined'.
```

## After Contract

- `mapCatalogSearchToWorkMaterials` now accepts `ReadonlyArray<CatalogSearchRow> | null | undefined`.
- Each row is normalized through an internal boundary contract before sorting.
- The internal mapped row type makes `available` required for this exact slice.
- Non-finite `qty_available` normalizes to `0` instead of leaking `NaN`.
- `rik_code`, `uom_code`, and display names are normalized to `string | null`.

## Runtime Semantics

Semantics changed: `false` for valid input.

- Valid success rows still map to `WorkMaterialRow` with `material_id: null`, `qty: 0`, `qty_fact: 0`, normalized name, `mat_code`, `uom`, and `available`.
- Valid sort order remains in-stock first, then higher `available`, then localized name.
- Empty payload remains an empty result.
- Partial and malformed payloads are deterministic and do not masquerade as false-empty.

## Compile Proof

Passed:

```bash
npx tsc --project tsconfig.strict-null-phase13-contractor-search.json --pretty false
npx tsc --noEmit --pretty false
```

## Regression Proof

Focused tests added in existing contractor suite `src/screens/contractor/contractor.loadWorksService.test.ts` to avoid increasing the repo source-module budget:

- valid input / ready state success path
- `null`
- `undefined`
- empty payload
- partial payload
- malformed payload
- terminal malformed row handling without `NaN`
- unchanged sort semantics

Passed:

```bash
npx jest src/screens/contractor/contractor.loadWorksService.test.ts --runInBand
npm test -- --runInBand
npm test
```

## Full Gate Proof

Passed:

```bash
npx tsc --project tsconfig.strict-null-phase13-contractor-search.json --pretty false
npx tsc --noEmit --pretty false
npx expo lint
npx jest src/screens/contractor/contractor.loadWorksService.test.ts --runInBand
npm test -- --runInBand
npm test
git diff --check
```

## Release Rule

Runtime TS changed in `src/screens/contractor/contractor.search.ts`, so Phase 13 requires commit, push, and OTA on `development`, `preview`, and `production` after the final clean worktree verification.
