# STRICT_BOUNDARY_PREP_PHASE_1 Notes

## Shortlist

- Candidate A — contractor submit/search boundary: safe prep, but lower process value.
  - Domain: contractor
  - Entry / owner path:
    - `src/screens/contractor/contractor.search.ts`
    - `src/screens/contractor/contractor.workProgressSubmitFlow.ts`
  - Real strict blockers:
    - `contractor.search.ts(32,18)` / `(33,18)` / `(35,45)` / `(35,59)` `available` possibly `undefined`
    - `contractor.workProgressSubmitFlow.ts(94,17)` / `(95,14)` `workModalRow` possibly `null`
  - Boundary type: process + transport normalization
  - Blast radius: 2-3 files
  - Cross-domain deps: low
  - Focused tests: yes
  - Why not chosen: already has explicit validation path; weaker shared-boundary value than buyer PDF busy contract.

- Candidate B — warehouse action boundary: too wide for this prep wave.
  - Domain: warehouse
  - Entry / owner path:
    - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Real strict blockers:
    - `(87,5)` optional `onListScroll` callback not assignable to required scroll handler
    - `(121,5)` optional `onListScroll` callback not assignable to required scroll handler
  - Boundary type: process / orchestration
  - Blast radius: 6+ downstream hooks/selectors
  - Cross-domain deps: medium inside warehouse screen orchestration
  - Focused tests: yes
  - Why not chosen: strict blocker is real, but callback contract fans out through lifecycle/tab/report/list render paths and is wider than needed for Phase 1 prep.

- Candidate C — foreman lifecycle/recovery: blocked by owner coupling.
  - Domain: foreman
  - Entry / owner path:
    - `src/screens/foreman/foreman.draftLifecycle.model.ts`
    - `src/screens/foreman/foreman.manualRecovery.model.ts`
    - `src/screens/foreman/foreman.localDraft.ts`
  - Real strict blockers: multiple `snapshot is possibly null` and `string | null | undefined` mismatches
  - Boundary type: lifecycle + recovery state
  - Blast radius: 8+ files
  - Cross-domain deps: high owner/state coupling
  - Focused tests: partial only
  - Why not chosen: needs owner-split prep before narrow strict work; not production-safe for this wave.

- Candidate D — buyer PDF busy boundary: chosen.
  - Domain: buyer
  - Entry / owner path:
    - `src/screens/buyer/useBuyerDocuments.ts`
    - `src/screens/buyer/useBuyerProposalAttachments.ts`
  - Real strict blockers before prep:
    - `useBuyerDocuments.ts(48,11)` `unknown` not assignable to `BusyLike | undefined`
    - `useBuyerProposalAttachments.ts(98,15)` `unknown` not assignable to `BusyLike | undefined`
  - Boundary type: shared process/busy contract between buyer hooks and PDF action boundary
  - Blast radius: 2 runtime hooks + 1 boundary helper + focused tests
  - Cross-domain deps: low; the lower PDF layer already exposes stable `BusyLike`
  - Focused tests: added in this wave
  - Why chosen: best balance of real blocker removal, explicit state contract, low blast radius, and clear unchanged-success proof.

## Chosen Boundary

- Cluster: buyer PDF busy boundary
- Exact scope:
  - `src/screens/buyer/useBuyerDocuments.ts`
  - `src/screens/buyer/useBuyerProposalAttachments.ts`
  - `tests/strict-null/buyer.pdf.busy.boundary.phase1.test.ts`

## What Stayed Out Of Scope

- `src/screens/buyer/hooks/useBuyerRfqPrefill.ts`
  - still has its own strict blocker, but it is a separate phone/prefill boundary and not part of the PDF busy contract
- warehouse action orchestration
- contractor submit/search boundary
- foreman lifecycle/recovery
- shared buyer/director API null-contract drift

## Why This Boundary Helps The Next Strict Wave

- It removes two real `unknown -> BusyLike` blockers without widening the wave into adjacent buyer loading/prefill logic.
- It makes the buyer PDF boundary deterministic before strict rollout:
  - `missing`
  - `invalid`
  - `loading`
  - `ready`
  - `terminal`
- It prevents malformed busy payloads from being treated as ready/manual owners.
- It keeps valid busy-owner behavior intact, so the next strict slice can focus on the remaining buyer-local nullable surfaces instead of re-solving this shared boundary.
- The boundary helpers were kept inline inside `useBuyerDocuments.ts` instead of a new `src` module so the wave stays within the repo performance-budget gate.

## Real Nullable / Contract Blockers Fixed Here

- Hidden `unknown` busy payload crossing from buyer hooks into the shared PDF action boundary
- Inline buyer PDF busy contract/state normalization exported from `useBuyerDocuments.ts`
- Empty object vs missing busy owner ambiguity
- Partial manual-busy payloads (`show` without `hide`, or vice versa) drifting into direct execution
- Terminal `isBusy()` inspection errors that previously could stay implicit
