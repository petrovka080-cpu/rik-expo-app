# STRICT_BOUNDARY_PREP_PHASE_1 Proof

## Probe Result

- Read-only shortlist completed across four readiness-plan candidates.
- Selected exact slice: buyer PDF busy boundary.
- Reason: it had the smallest shared blast radius with real strict blockers and the clearest process-contract upgrade.

## Before / After Blockers

### Before

- `src/screens/buyer/useBuyerDocuments.ts(48,11)`
  - `Type 'unknown' is not assignable to type 'BusyLike | undefined'.`
- `src/screens/buyer/useBuyerProposalAttachments.ts(98,15)`
  - `Type 'unknown' is not assignable to type 'BusyLike | undefined'.`

### After

- Re-running `npx tsc --noEmit --pretty false --strictNullChecks` no longer reports `useBuyerDocuments.ts` or `useBuyerProposalAttachments.ts`.
- The adjacent buyer blocker that remains is intentionally outside this wave:
  - `src/screens/buyer/hooks/useBuyerRfqPrefill.ts(43,72)`

## Contract Before / After

### Before

- Buyer PDF hooks accepted `busy: unknown` and forwarded it directly into `prepareAndPreviewPdfDocument`.
- Runtime effectively inferred behavior from whatever fields happened to exist.
- Broken input could drift into the direct/manual path without an explicit boundary classification.

### After

- Buyer PDF hooks still accept `busy: unknown`, but they now normalize it through inline exported boundary helpers in `useBuyerDocuments.ts`:
  - `resolveBuyerPdfBusyBoundary`
  - `normalizeBuyerPdfBusy`
- Boundary states are explicit and deterministic:
  - `missing`
  - `invalid`
  - `loading`
  - `ready`
  - `terminal`
- Rules now enforced inside the exact slice:
  - `null` / `undefined` => `missing`
  - empty object / unrelated object => `invalid`
  - partial manual contract => `invalid`
  - valid busy owner with active `isBusy(flowKey)` => `loading`
  - valid idle busy owner => `ready`
  - thrown `isBusy(flowKey)` => `terminal`

## State Separation Proof

- `missing` is no longer mixed with empty payload:
  - `null` / `undefined` classify as `missing`
  - `{}` classifies as `invalid`
- `invalid` is no longer mixed with `loading`:
  - partial manual payload (`show` without `hide`) classifies as `invalid`
  - only a valid busy contract with `isBusy(flowKey) === true` classifies as `loading`
- broken input is no longer treated as a ready busy-owner contract
- terminal inspection failures are surfaced as `terminal`, not collapsed into a normal ready state

## Regression Proof

Focused tests added:

- `tests/strict-null/buyer.pdf.busy.boundary.phase1.test.ts`
  - valid input
  - null
  - undefined
  - empty payload
  - partial payload
  - invalid state
  - loading state
  - ready state
  - terminal state
  - unchanged proposal PDF success path
  - unchanged attachment PDF success path

Changed-file regression:

- `src/screens/buyer/buyer.silentCatch.test.ts`
  - still passes, proving no regression to swallowed buyer PDF behavior

Governance / performance proof:

- `tests/perf/performance-budget.test.ts` passes after keeping the boundary helper inline in `useBuyerDocuments.ts`
- this preserved the repo module-count budget without widening the runtime slice

## Unchanged Runtime Semantics

- Valid busy-owner success path is unchanged:
  - proposal PDF still opens with the same busy owner function references
  - attachment PDF still opens with the same busy owner function references
- Business logic unchanged:
  - no permission changes
  - no role changes
  - no network/RPC changes
  - no success output changes on valid input
- Invalid busy payloads now normalize to no busy owner instead of being silently treated as a valid contract. This is boundary hardening on invalid input, not a change to valid-path business behavior.

## Why The Next Strict Wave Is Safer

- The shared buyer PDF busy boundary is now explicit, deterministic, and locally test-covered.
- The next strict slice no longer needs to solve `unknown -> BusyLike` in two separate hooks.
- Remaining buyer strict work can target adjacent, narrower surfaces without reopening this shared contract.

## Compile / Gate Proof

- `npx jest tests/strict-null/buyer.pdf.busy.boundary.phase1.test.ts --runInBand` PASS
- `npx jest src/screens/buyer/buyer.silentCatch.test.ts --runInBand` PASS
- `npx jest tests/perf/performance-budget.test.ts --runInBand` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS
