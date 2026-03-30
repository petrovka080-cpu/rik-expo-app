# Wave 1A - Drift Risk Register

This register captures current production-relevant drift scenarios only. No fixes are implemented in this phase.

## R1. Proposal Head Created Before Stable Item Set

- Root cause:
  - Buyer proposal creation is split across `proposal_create`, `proposal_add_items`, metadata sync, submit, and request-item status sync.
- Affected files:
  - `src/screens/buyer/buyer.submit.mutation.ts`
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
  - `src/lib/api/proposals.ts`
- Affected DB entities:
  - `public.proposals`
  - `public.proposal_items`
- Real consequence:
  - proposal head can exist while linked items are incomplete or still being patched
- Severity:
  - critical
- Target phase for fix:
  - `Proposal Atomic Boundary`

## R2. Proposal Submit Visibility Depends On Multi-Step Orchestration

- Root cause:
  - visibility to director only becomes reliable after submit verification, while other proposal writes happen before and around it
- Affected files:
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
  - `src/lib/api/proposals.ts`
- Affected DB entities:
  - `public.proposals`
  - `public.request_items`
- Real consequence:
  - proposal may be partially created or partially synchronized when director visibility is expected
- Severity:
  - critical
- Target phase for fix:
  - `Proposal Atomic Boundary`

## R3. Attachment Side Effects Can Drift From Business Commit

- Root cause:
  - buyer attachment upload runs after proposal creation and is not part of the business mutation boundary
- Affected files:
  - `src/screens/buyer/buyer.submit.mutation.ts`
  - `src/screens/buyer/buyer.attachments.mutation.ts`
- Affected DB entities:
  - `public.proposals`
  - attachment storage and linkage rows
- Real consequence:
  - business entity exists while attachment state lags, duplicates, or fails independently
- Severity:
  - medium
- Target phase for fix:
  - `Proposal Atomic Boundary` compatibility shell

## R4. Submitted Request Can Drift Against Local Draft Lifecycle

- Root cause:
  - foreman local draft and offline queue remain active ownership layers before and around submit
- Affected files:
  - `src/screens/foreman/foreman.localDraft.ts`
  - `src/screens/foreman/hooks/useForemanDraftBoundary.ts`
  - `src/lib/api/requestDraftSync.service.ts`
  - `src/lib/api/requests.ts`
- Affected DB entities:
  - `public.requests`
  - `public.request_items`
- Real consequence:
  - local snapshot may continue to reconcile around already submitted server state
- Severity:
  - high
- Target phase for fix:
  - `Request Draft Lifecycle Hardening`

## R5. Head/Item Status Mismatch In Request Reopen And Submit Paths

- Root cause:
  - reopen still performs direct table updates, while submit uses atomic RPC and sync path uses a separate RPC family
- Affected files:
  - `src/lib/api/requests.ts`
  - `src/lib/api/request.repository.ts`
  - `src/lib/api/requestDraftSync.service.ts`
- Affected DB entities:
  - `public.requests`
  - `public.request_items`
- Real consequence:
  - head and item status can diverge depending on which path was used last
- Severity:
  - high
- Target phase for fix:
  - `Request Draft Lifecycle Hardening`

## R6. Request Item To Request Link Is Weaker Than Proposal Item To Request Item Link

- Root cause:
  - generated schema shows `proposal_items.request_item_id` FK, but no exposed `request_items.request_id` FK contract
- Affected files:
  - `src/lib/database.types.ts`
  - `src/lib/api/requests.ts`
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
- Affected DB entities:
  - `public.request_items`
  - `public.requests`
  - `public.proposal_items`
- Real consequence:
  - request chain integrity depends partly on conventions and runtime discipline rather than full DB-enforced lineage
- Severity:
  - high
- Target phase for fix:
  - `Object Identity / Chain Integrity`

## R7. Director Object Grouping Depends On Text Normalization

- Root cause:
  - director report grouping still uses `canonicalObjectName()` and note parsing instead of strict object UUIDs only
- Affected files:
  - `src/lib/api/director_reports.context.ts`
  - `src/lib/api/director_reports.payloads.discipline.ts`
  - `src/lib/api/director_reports.fallbacks.ts`
- Affected DB entities:
  - `public.requests`
  - `public.v_director_issued_fact_rows`
  - transport RPC results
- Real consequence:
  - same object can group differently or survive as text-only identity without immutable backing
- Severity:
  - high
- Target phase for fix:
  - `Director Fact Projection Hardening`

## R8. Director Report Aggregation Reads Mutable Sources Through Fallback Branches

- Root cause:
  - report loaders can switch between RPC, views, and derived request lookups
- Affected files:
  - `src/lib/api/director_reports.service.report.ts`
  - `src/lib/api/director_reports.service.discipline.ts`
  - `src/lib/api/directorReportsTransport.service.ts`
- Affected DB entities:
  - `public.director_report_transport_scope_v1`
  - `public.director_report_fetch_materials_v1`
  - `public.v_director_issued_fact_rows`
  - `public.acc_report_issue_lines`
- Real consequence:
  - director numbers can depend on branch selection and mutable source shape
- Severity:
  - high
- Target phase for fix:
  - `Director Fact Projection Hardening`

## R9. Buyer Counterparty Binding Depends On Name Matching

- Root cause:
  - proposal creation binds suppliers and contractors by normalized names, not only immutable IDs flowing from source chain
- Affected files:
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
- Affected DB entities:
  - `public.suppliers`
  - `public.contractors`
  - `public.proposals`
  - `public.proposal_items`
- Real consequence:
  - supplier or contractor linkage can drift if names or display formats diverge
- Severity:
  - medium
- Target phase for fix:
  - `Proposal Atomic Boundary`

## R10. Director Finance Truth And Director Report Truth Can Be Confused

- Root cause:
  - finance scope is server-owned, report scope is still mixed, but both surface under director domain
- Affected files:
  - `src/lib/api/directorFinanceScope.service.ts`
  - `src/lib/api/directorReportsScope.service.ts`
- Affected DB entities:
  - `public.director_finance_panel_scope_v3`
  - `public.director_report_transport_scope_v1`
  - `public.proposal_payments`
  - `public.proposal_payment_allocations`
- Real consequence:
  - future work may incorrectly harden or trust the wrong director source as immutable truth
- Severity:
  - medium
- Target phase for fix:
  - `Director Fact Projection Hardening`

## R11. Duplicate Or Replay Risk On Buyer Proposal Create Remains Above DB Core

- Root cause:
  - supplier-bucket orchestration and downstream stages are still coordinated client-side
- Affected files:
  - `src/screens/buyer/buyer.submit.mutation.ts`
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
- Affected DB entities:
  - `public.proposals`
  - `public.proposal_items`
- Real consequence:
  - retries or partial re-entry can create duplicate heads or repeated downstream side effects
- Severity:
  - critical
- Target phase for fix:
  - `Proposal Atomic Boundary`

## R12. Attachment / Business Entity Linkage Is Not Fully Atomic

- Root cause:
  - request and proposal attachment handling remains adjacent to, but not inside, business commit boundaries
- Affected files:
  - `src/screens/buyer/buyer.attachments.mutation.ts`
  - request and proposal action families
- Affected DB entities:
  - `public.proposals`
  - attachment linkage rows
- Real consequence:
  - attachment presence can be mistaken for business completeness
- Severity:
  - medium
- Target phase for fix:
  - compatibility shell after atomic business boundaries
