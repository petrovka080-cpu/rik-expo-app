# STRICT_NULLCHECKS_PHASE_5 Notes

## Shortlist probe

- Candidate A: `src/screens/contractor/contractor.search.ts`
  - Domain: contractor material search mapper
  - Entry / owner path: `src/screens/contractor/contractor.search.ts`
  - Real strict-null blockers:
    - `a.available` possibly `undefined`
    - `b.available` possibly `undefined`
    - comparator subtraction on optional `available`
  - Blast radius: 1 source file plus focused tests/config
  - Cross-domain dependencies: type-only dependency on `WorkMaterialRow`
  - Realistically touched files: 1-2
  - Focused tests: none yet
  - Safe rollout: yes
  - Verdict: safe, but not chosen because office reentry already had focused regression coverage and a narrower guard-only fix
- Candidate B: `src/screens/warehouse/warehouse.pdf.boundary.ts`
  - Domain: warehouse PDF preview boundary
  - Entry / owner path: `src/screens/warehouse/warehouse.pdf.boundary.ts`
  - Real strict-null blockers:
    - `supabase: null` is not assignable to `PdfDocumentSupabaseLike`
    - probe also surfaced strict-null failures in `warehouse.pdf.boundary.test.tsx`
  - Blast radius: warehouse boundary plus shared PDF action types/tests
  - Cross-domain dependencies: shared document/PDF types used outside warehouse
  - Realistically touched files: at least 3
  - Focused tests: yes
  - Safe rollout: no
  - Verdict: blocked by cross-domain dependencies
- Candidate C: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Domain: warehouse screen action orchestration
  - Entry / owner path: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Real strict-null blockers:
    - optional `data.headerApi.onListScroll` passed into `useWarehouseListUi`
    - optional `data.headerApi.onListScroll` passed into `useWarehouseReportActions`
  - Blast radius: action hook plus adjacent hook contracts and header API surface
  - Cross-domain dependencies: warehouse hook graph (`useWarehouseListUi`, `useWarehouseReportActions`, header API contract)
  - Realistically touched files: at least 4
  - Focused tests: indirect only
  - Safe rollout: no
  - Verdict: too wide for phase 5
- Candidate D: `src/screens/office/office.reentry.ts`
  - Domain: office focus-refresh reentry boundary
  - Entry / owner path: `src/screens/office/office.reentry.ts`
  - Real strict-null blockers:
    - `src/screens/office/office.reentry.ts(40,5)`
    - `src/screens/office/office.reentry.ts(44,5)`
    - both came from returning `OfficeReturnReceipt` after a boolean helper that did not narrow nullable receipt state
  - Blast radius: `office.reentry.ts` plus one office-local guard in `officeHub.helpers.tsx`
  - Cross-domain dependencies: none outside office-local refresh boundary
  - Realistically touched files: 2 source files plus focused tests/config
  - Focused tests:
    - `src/screens/office/office.reentry.test.ts`
    - `tests/office/officeHub.extraction.test.ts`
  - Safe rollout: yes
  - Verdict: chosen for phase 5

## Chosen slice

- `src/screens/office/office.reentry.ts`

## Why this slice was chosen

- The strict-null blocker class was local to the office reentry boundary.
- The fix stayed inside the existing receipt guard instead of changing business flow.
- Focused regression coverage already existed and was easy to extend with exact boundary tests.
- No warehouse, contractor, auth, or release-tooling rollout was required.

## Real nullable blockers

- `OfficeReturnReceipt` explicitly permits `null | undefined`.
- `resolveOfficeWarmReturnReceipt` returned the raw receipt after `isWarehouseOfficeReturnReceipt(...)`.
- `isWarehouseOfficeReturnReceipt(...)` returned `boolean`, so strict-null could not prove that the receipt was narrowed to a non-null record.

## Exact fix

- Added an explicit office-local guard type:
  - `WarehouseOfficeReturnReceipt`
- Converted the existing helper into a true type predicate:
  - `isWarehouseOfficeReturnReceipt(...)`
- Added focused phase-5 regression coverage:
  - `tests/strict-null/office.reentry.phase5.test.ts`

## Intentionally out of scope

- no global `strictNullChecks`
- no contractor material search rollout
- no warehouse PDF boundary rollout
- no warehouse action-hook contract cleanup
- no OfficeHub UI redesign
- no release tooling changes

## Release-tail note

- Phase 5 runtime release tail was executed only after shelving unrelated pre-existing worktree noise outside the chosen slice:
  - `android/app/src/main/res/values/strings.xml`
  - `eas.json`
- That kept the phase scope narrow and allowed a clean commit/push/OTA without widening into release-tooling or Android config cleanup.
