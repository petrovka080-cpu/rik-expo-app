# Wave 1A - Contract Inventory & Freeze

Scope of this phase:

- `object-identity-contract`
- `proposal-creation-boundary`
- `request-submit-boundary`
- `director-fact-contract`

This document captures current production-relevant contracts only. It does not introduce any new SQL, RPC, UI, policy, or runtime behavior.

## False Friends / Domain Confusion

These domains are currently adjacent in code but are not the same contract and must not be merged in later phases:

1. Construction object identity
   - Canonical DB entity: `public.objects.id`
   - Runtime consumers also use `requests.object_id`, `requests.object_name`, `requests.object_type_code`, `requests.system_code`, `requests.level_code`, `requests.zone_code`
   - Director reports still derive grouping from normalized text in `src/lib/api/director_reports.context.ts`

2. Material or catalog identity
   - Canonical DB entity: `public.catalog_items.id`
   - Production matching usually falls back to `catalog_items.rik_code`, `request_items.rik_code`, `proposal_items.rik_code`
   - Buyer proposal creation and report grouping still rely on `rik_code` and `name_human`, not only catalog UUID

3. Request and proposal chain identity
   - Canonical head chain: `requests.id -> request_items.id -> proposal_items.request_item_id -> proposals.id`
   - This chain is strong at `proposal_items.request_item_id`, but weaker around `request_items.request_id` because generated schema does not expose an FK there

4. Finance identity
   - Canonical payment chain: `proposals.id -> proposal_payments.id -> proposal_payment_allocations.proposal_item_id`
   - Finance truth is proposal-centric, not object-centric
   - Director finance and director warehouse/report facts are separate contracts and should not be unified as one “director truth”

## Object Identity Contract

### Current Owner of Truth

- Mixed
- Strong owner for base object record: `public.objects`
- Strong owner for request-to-object link: `public.requests.object_id`
- Mixed owner for director grouping and reporting:
  - `src/lib/api/director_reports.context.ts`
  - `src/lib/api/director_reports.payloads.discipline.ts`
  - `src/lib/api/director_reports.fallbacks.ts`

### Actual Production Path

1. Foreman and request flows persist `requests.object_id`, `requests.object_name`, `requests.object_type_code`, `requests.system_code`, `requests.level_code`, `requests.zone_code`.
2. Buyer proposal creation inherits request chain identity through `proposal_items.request_item_id` and sometimes patches `proposals.request_id`.
3. Director report loaders consume fact rows from:
   - `src/lib/api/directorReportsTransport.service.ts`
   - `src/lib/api/director_reports.service.report.ts`
   - `src/lib/api/director_reports.service.discipline.ts`
4. Director object grouping still uses:
   - `canonicalObjectName()`
   - `resolveDirectorObjectIdentity()`
   - `matchesDirectorObjectIdentity()`
   in `src/lib/api/director_reports.context.ts`
5. Free-issue and fallback paths can reconstruct object identity from `issue_note` text and contextual parsing rather than a strict object FK.

### Data Entities Involved

- Tables:
  - `public.objects`
  - `public.requests`
  - `public.request_items`
  - `public.proposals`
  - `public.proposal_items`
  - `public.catalog_items`
  - `public.proposal_payments`
  - `public.proposal_payment_allocations`
- Views and RPCs:
  - `public.director_report_transport_scope_v1`
  - `public.director_report_fetch_materials_v1`
  - `public.v_director_issued_fact_rows`
  - `public.acc_report_issue_lines`
  - `public.acc_report_issues_v2`
- Derived runtime entities:
  - `DirectorFactRowNormalized`
  - `RequestLookupRow`

### API/RPC/Table Writes

- No single server-owned object-identity mutation boundary exists in this contract family.
- Identity is written indirectly by:
  - `src/lib/api/requests.ts`
  - `src/lib/api/requestDraftSync.service.ts`
  - `src/lib/catalog/catalog.proposalCreation.service.ts`
- Director side is read-heavy; it composes identity rather than writing it.

### Client-Side Glue / Fallback Usage

- `canonicalObjectName()` strips suffixes and normalizes display text
- free-issue parsers reconstruct object, system, zone, level from note text
- report grouping can match by normalized object name even when object UUID is absent
- material grouping and object grouping sit side by side in the same transport pipeline

### Known Integrity Risks

- Object identity is mixed with display identity in director reports
- Object grouping can stay stable while the underlying `object_id` is absent or inconsistent
- Material identity (`rik_code`) and object identity are easy to conflate during report composition
- Some proposal and report paths depend on request lookup reconstruction, not on an immutable object fact table

### Recommended Server-Owned Target Boundary

- Keep `objects.id` and `requests.object_id` as the only canonical object identity chain
- Treat director report object grouping as a server-owned projection boundary in a later phase
- Move text normalization to compatibility-only rendering, not truth ownership

### Out of Scope For Next Phase

- No object ledger table
- No shadow object UUID migration
- No director UI redesign
- No report transport rewrite in this phase

## Proposal Creation Boundary

### Current Owner of Truth

- Mixed, client-orchestrated
- Buyer UI/controller starts mutation and coordinates several server writes
- No single production atomic RPC owns the full proposal creation lifecycle today

### Actual Production Path

Entrypoints:

- `src/screens/buyer/hooks/useBuyerCreateProposalsFlow.ts`
  - `handleCreateProposalsBySupplier()`
- `src/screens/buyer/buyer.submit.mutation.ts`
  - `handleCreateProposalsBySupplierAction()`

Server-facing orchestration:

- `src/lib/catalog_api.ts`
  - `apiCreateProposalsBySupplier()`
- `src/lib/catalog/catalog.proposalCreation.service.ts`
  - `createProposalsBySupplier()`
  - `resolveProposalCreationPreconditions()`
  - `createProposalHeadStage()`
  - `linkProposalItemsStage()`
  - `completeProposalCreationStage()`
  - `syncProposalRequestItemStatusStage()`

DB writes invoked by the current path:

1. Proposal head create:
   - `src/lib/api/proposals.ts`
   - `proposalCreateFull()`
   - RPC `public.proposal_create`
2. Proposal head patch:
   - direct `public.proposals.update(...)`
3. Proposal items link:
   - `proposalAddItems()`
   - RPC `public.proposal_add_items`
   - fallback direct `public.proposal_items.insert(...)`
4. Proposal item metadata and snapshot sync:
   - `proposalSetItemsMeta()`
   - RPC `public.proposal_items_snapshot`
   - fallback direct `public.proposal_items.upsert/update(...)`
5. Proposal submit:
   - `proposalSubmit()`
   - primary RPC `public.proposal_submit_text_v1`
   - compat RPC `public.proposal_submit`
6. Request-item status sync:
   - RPC `public.request_items_set_status`
   - fallback direct `public.request_items.update(...)`
7. Attachments after proposal create:
   - `src/screens/buyer/buyer.attachments.mutation.ts`
   - `uploadSupplierProposalAttachmentsMutation()`

### Data Entities Involved

- Tables:
  - `public.proposals`
  - `public.proposal_items`
  - `public.request_items`
  - `public.requests`
  - `public.suppliers`
  - `public.contractors`
- Views and RPCs:
  - `public.proposal_items_view`
  - `public.proposal_snapshot_items`
  - `public.proposal_items_for_web`
  - `public.proposal_request_item_integrity_v1`
  - `public.proposal_request_item_integrity_guard_v1`
  - `public.proposal_create`
  - `public.proposal_add_items`
  - `public.proposal_submit_text_v1`
  - `public.proposal_submit`
  - `public.request_items_set_status`

Inactive candidate, not current production owner:

- `supabase/migrations/20260330200000_proposal_creation_boundary_v3.sql`
  - `rpc_proposal_create_atomic_v3`
  - present in repo, but not wired from current buyer runtime path

### API/RPC/Table Writes

- Current owner of mutation start:
  - `handleCreateProposalsBySupplierAction()`
- Current owner of orchestration:
  - `createProposalsBySupplier()`
- Current owner of final visibility:
  - `proposalSubmit()` verification against `public.proposals`
- Direct table writes still present:
  - `public.proposals`
  - `public.proposal_items`
  - `public.request_items`

### Client-Side Glue / Fallback Usage

- Supplier and contractor identity is derived by normalized text matching in `createProposalsBySupplier()`
- Buyer runtime groups items into supplier buckets before server writes
- Attachment upload is a second-stage side effect after business mutation
- Submit and request-item status sync are still separate downstream steps from head create

### Known Integrity Risks

- Proposal head can exist before items are linked
- Proposal item metadata can diverge from snapshot rows during fallback branches
- Request item status sync can fail after proposal submit
- Attachment upload can succeed or fail independently of business mutation
- Client still coordinates too many write stages for a commercial boundary

### Recommended Server-Owned Target Boundary

- First implementation phase should be `Proposal Atomic Boundary`
- Target shape:
  - one server-owned mutation for head + items + integrity check + submit visibility contract
  - attachments remain compatibility side effect outside the atomic core
  - buyer runtime becomes adapter only

### Out of Scope For Next Phase

- Buyer UI redesign
- Attachment UX changes
- Director UI changes
- Supplier picker redesign

## Request Submit Boundary

### Current Owner of Truth

- Mixed before submit
- More server-owned at submit itself
- Foreman still owns local draft lifecycle and offline queue orchestration before the final submit boundary

### Actual Production Path

Entrypoints:

- `src/lib/api/request.repository.ts`
  - `submitRequestToDirector()`
- `src/screens/foreman/hooks/useForemanDraftBoundary.ts`
  - `useForemanDraftBoundary()`
- `src/screens/foreman/foreman.draftSync.repository.ts`
  - `syncForemanDraftToServer()` production sync entry

Draft and edit chain:

- `src/lib/api/requests.ts`
  - `getOrCreateDraftRequestId()`
  - `findReusableEmptyDraftRequestId()`
  - `reuseExistingDraftRequest()`
  - `insertDraftRequest()`
  - `addRequestItemFromRikDetailed()`
  - `requestReopen()`

Atomic submit path:

- `src/lib/api/requests.ts`
  - `requestSubmitMutation()`
  - `runRequestSubmitAtomicStage()`
  - RPC `public.request_submit_atomic_v1`

Offline and full draft sync path:

- `src/lib/api/requestDraftSync.service.ts`
  - `syncRequestDraftViaRpc()`
  - RPC `public.request_sync_draft_v2`

Post-submit side effects:

- `src/lib/api/request.repository.ts`
  - `broadcastDirectorRequestSubmitted()`
  - `notifyDirectorRequestSubmitted()`

### Data Entities Involved

- Tables:
  - `public.requests`
  - `public.request_items`
  - `public.notifications`
- RPCs:
  - `public.request_find_reusable_empty_draft_v1`
  - `public.request_item_add_or_inc`
  - `public.request_submit_atomic_v1`
  - `public.request_sync_draft_v2`
- Local/client state:
  - `src/screens/foreman/foreman.localDraft.ts`
  - local snapshot and offline queue state

### API/RPC/Table Writes

- Draft create and draft reuse still use direct `requests.insert/update`
- Item addition uses `request_item_add_or_inc`, then direct metadata patch on `request_items`
- Reopen uses direct `requests.update` and `request_items.update`
- Submit itself is server-owned by `request_submit_atomic_v1`
- Full draft sync is server-owned by `request_sync_draft_v2`

### Client-Side Glue / Fallback Usage

- Local draft cache and queue mediate write ownership before submit
- Reopen path is still client-driven direct mutation
- Post-submit notifications are outside the submit atomic boundary
- Foreman boundary still reconciles local and server draft state

### Known Integrity Risks

- Draft lifecycle remains mixed between local truth and server truth
- Reopen can mutate a server-submitted entity outside the submit boundary
- Head and item status reconciliation still depends on multiple code paths
- Post-submit side effects are not part of the atomic business commit

### Recommended Server-Owned Target Boundary

- Keep `request_submit_atomic_v1` as current canonical submit owner
- Later phase should focus on draft lifecycle hardening, not replace submit first
- The next implementation phase should not start here because proposal creation remains the higher commercial risk

### Out of Scope For Next Phase

- Foreman UI refactor
- Offline queue redesign
- Local draft UX changes

## Director Fact Contract

### Current Owner of Truth

- Split contract
- Finance scope is mostly server-owned through `director_finance_panel_scope_v3`
- Warehouse/report transport remains mixed due to fallback chains and JS composition

### Actual Production Path

Finance scope:

- `src/lib/api/directorFinanceScope.service.ts`
  - `loadDirectorFinanceScope()`
- `src/screens/director/director.finance.rpc.ts`
  - `fetchDirectorFinancePanelScopeV3ViaRpc()`
- canonical source:
  - RPC `public.director_finance_panel_scope_v3`

Report and warehouse facts:

- `src/lib/api/directorReportsScope.service.ts`
  - `loadDirectorReportsScope()`
- `src/lib/api/directorReportsTransport.service.ts`
  - `loadDirectorReportTransportScope()`
  - `loadDirectorReportTransportScopeLive()`
- `src/lib/api/director_reports.service.report.ts`
  - material report loader with fallback chain
- `src/lib/api/director_reports.service.discipline.ts`
  - works/disciplines loader with fallback chain

Fallback chain still reachable in report family:

- RPC `public.director_report_fetch_materials_v1`
- RPC `public.director_report_transport_scope_v1`
- legacy fast or acc report RPCs
- view `public.v_director_issued_fact_rows`
- direct or semi-direct mutable source composition from issue/request data

### Data Entities Involved

- RPCs:
  - `public.director_finance_panel_scope_v3`
  - `public.director_report_transport_scope_v1`
  - `public.director_report_fetch_materials_v1`
- Views:
  - `public.v_director_issued_fact_rows`
  - `public.v_director_finance_rows`
  - `public.v_director_finance_spend_kinds_v3`
- Tables and source chains:
  - `public.requests`
  - `public.request_items`
  - `public.proposals`
  - `public.proposal_items`
  - `public.proposal_payments`
  - `public.proposal_payment_allocations`

### API/RPC/Table Writes

- Director fact contract is effectively read-only in runtime
- Risk comes from loading mutable sources and composing them client-side, not from direct writes on director screens

### Client-Side Glue / Fallback Usage

- Director warehouse/report transport still chooses among multiple fallback sources
- Object and location grouping are normalized in JS
- Some fact enrichment depends on request lookups and name recovery
- Finance scope still performs JS-level canonical shaping after RPC response

### Known Integrity Risks

- Director report truth is not a single immutable fact projection yet
- Report grouping can drift when object identity is text-derived
- Mutable source rows can be aggregated differently across fallback branches
- Finance projection is cleaner than report projection, but should not be mistaken for a full director fact contract

### Recommended Server-Owned Target Boundary

- Keep finance on `director_finance_panel_scope_v3`
- Treat warehouse/report chain as later projection hardening phase after atomic proposal boundary
- Do not fold finance and report facts into one implementation batch

### Out of Scope For Next Phase

- Director UI or chart redesign
- New warehouse fact ledger
- Object shadow-identity rollout

## Current Freeze Conclusion

Current highest-risk mixed production boundary is proposal creation:

- it is buyer-facing commercial write logic
- it remains client-orchestrated across multiple DB writes
- it still contains direct table fallbacks
- it still owns visibility and request-item synchronization indirectly

### Next Implementation Phase

The first implementation phase should be:

- `Proposal Atomic Boundary`

Why first:

1. It is the highest commercial write-risk.
2. It still depends on client orchestration instead of one server-owned mutation.
3. It sits upstream of director visibility and accountant finance truth.
4. Hardening object identity or director projection first would still leave the main write chain mixed.
