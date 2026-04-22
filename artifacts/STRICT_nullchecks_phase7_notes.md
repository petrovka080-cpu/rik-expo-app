# STRICT_NULLCHECKS_PHASE_7 Notes

## Shortlist probe

- Candidate A: `src/lib/pdf/pdfViewer.route.ts`
  - Domain: PDF viewer route/input contract
  - Entry / owner path: `src/lib/pdf/pdfViewer.route.ts`
  - Real strict-null blockers: none, isolated probe PASS
  - Boundary type: route
  - Blast radius: 1 source file plus focused tests
  - Cross-domain dependencies: none beyond PDF viewer route helpers
  - Realistically touched files: 1-2
  - Focused tests: `tests/pdf/pdfViewer.route.test.ts`
  - Process/control value: yes, but weaker for this phase because there was no live blocker
  - Safe rollout: yes
  - Verdict: safe, weaker value
- Candidate B: `src/screens/foreman/foreman.terminalRecovery.ts`
  - Domain: foreman terminal recovery classification
  - Entry / owner path: `src/screens/foreman/foreman.terminalRecovery.ts`
  - Real strict-null blockers pulled by probe:
    - `src/lib/api/buyer.ts(267,68)`
    - `src/lib/api/director.ts(306,5)`
    - `src/lib/pdf/directorSupplierSummary.shared.ts(305,45)`
    - `src/screens/foreman/foreman.localDraft.ts(541,9)` through `(546,9)`
  - Boundary type: recovery
  - Blast radius: foreman recovery plus local draft and shared API/PDF helpers
  - Cross-domain dependencies: buyer, director, shared PDF summary, foreman local draft
  - Realistically touched files: at least 5
  - Focused tests: `src/screens/foreman/foreman.terminalRecovery.test.ts`
  - Process/control value: high
  - Safe rollout: no
  - Verdict: blocked by cross-domain deps
- Candidate C: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Domain: warehouse screen orchestration
  - Entry / owner path: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Real strict-null blockers pulled by probe:
    - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts(87,5)`
    - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts(121,5)`
    - `src/lib/api/canonicalPdfBackendInvoker.ts(168,5)`
    - `src/screens/warehouse/warehouse.pdf.boundary.ts(150,9)`
  - Boundary type: process
  - Blast radius: warehouse action orchestration plus adjacent PDF/backend contracts
  - Cross-domain dependencies: shared canonical PDF backend invoker and warehouse PDF preview boundary
  - Realistically touched files: at least 4
  - Focused tests: indirect only
  - Process/control value: high
  - Safe rollout: no
  - Verdict: too wide
- Candidate D: `src/screens/warehouse/warehouse.pdf.boundary.ts`
  - Domain: warehouse PDF preview/open boundary
  - Entry / owner path: `src/screens/warehouse/warehouse.pdf.boundary.ts`
  - Real strict-null blocker:
    - `src/screens/warehouse/warehouse.pdf.boundary.ts(150,9): Type 'null' is not assignable to type 'PdfDocumentSupabaseLike'.`
  - Boundary type: process + transport
  - Blast radius: one warehouse-local preview boundary plus focused tests/config
  - Cross-domain dependencies: shared PDF document action types only, no extra touched owners required
  - Realistically touched files: 1 source file plus focused tests/config/artifacts
  - Focused tests:
    - `src/screens/warehouse/warehouse.pdf.boundary.test.tsx`
    - `tests/strict-null/warehouse.pdf.boundary.phase7.test.ts`
  - Process/control value: high
  - Safe rollout: yes
  - Verdict: chosen for Phase 7

## Chosen slice

- `src/screens/warehouse/warehouse.pdf.boundary.ts`

## Why this slice was chosen

- It produced a real local strict-null blocker immediately.
- The boundary sits exactly on the warehouse PDF open/control transition between invalid input, ready request, and terminal open failure.
- The fix stayed inside the warehouse-local preview boundary without pulling shared transport or neighboring warehouse orchestration files into scope.
- Existing focused regression tests already covered the happy-path open flow and controlled failure path, and the phase extended them with exact contract-state tests.

## How this slice improves process control

- It makes the request contract explicit instead of relying on implicit throws.
- It separates `invalid` input from `ready` preview intent before entering the document open flow.
- It hardens remote source normalization so malformed payloads cannot drift into hidden fallback behavior.
- It replaces a fake nullable invariant (`supabase: null`) with a deterministic non-null no-auth contract for this exact boundary.

## Real nullable blockers

- The warehouse preview boundary passed `supabase: null` into `prepareAndPreviewPdfDocument(...)`.
- Under strict-null, that violated the shared `PdfDocumentSupabaseLike` contract even though this exact boundary does not require authenticated Supabase access for its remote PDF preview flow.

## Exact fix

- Added an explicit preview request input contract:
  - `WarehousePdfPreviewRequestInput`
- Added explicit request-state classification:
  - `resolveWarehousePdfPreviewContract(...)`
- Added deterministic remote source normalization:
  - `normalizeWarehousePdfRemoteUrl(...)`
- Replaced the nullable preview invariant with a stable non-null local contract:
  - `WAREHOUSE_PDF_PREVIEW_SUPABASE = {}`
- Added focused phase-7 regression coverage:
  - `tests/strict-null/warehouse.pdf.boundary.phase7.test.ts`

## Intentionally out of scope

- no global `strictNullChecks`
- no warehouse screen orchestration rollout
- no canonical PDF backend transport rollout
- no foreman recovery rollout
- no shared PDF action type redesign
- no release tooling changes
- no SQL/RPC semantics changes
- no UI redesign
