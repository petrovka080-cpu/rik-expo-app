# Canonical RPC And Migration Versions

## Scope

This document is the Wave 21 source of truth for the currently risky RPC and migration families.
It does not rewrite migrations and it does not authorize squash/reorder work.

## Rules

- Canonical means: latest production version that current repo callers are expected to use.
- Legacy predecessor means: older version, fallback, or earlier migration step retained for history/compatibility.
- Hotfix migrations in an active chain must not be squashed or rewritten in-place.
- Caller migration must happen before any legacy deletion is considered.

## Request Lifecycle Chain

### Family

- Request submit / reopen lifecycle boundary

### Canonical runtime versions

- `public.request_submit_atomic_v1`
- `public.request_reopen_atomic_v1`

### Active repo callers

- `src/lib/api/requests.ts`
- request lifecycle map in `docs/architecture/request-lifecycle-transition-map.md`

### Active migration chain

- submit:
  - `20260330193000_request_submit_atomic_v1.sql`
  - `20260330193100_request_submit_atomic_v1_grants.sql`
  - `20260330194000_request_submit_atomic_v1_status_probe_fix.sql`
  - `20260330230100_request_submit_atomic_v1_empty_guard.sql`
- reopen:
  - `20260330230400_request_reopen_atomic_v1.sql`
  - `20260330230500_request_reopen_atomic_v1_function.sql`
  - `20260330230600_request_reopen_atomic_v1_grants.sql`
  - `20260330230700_request_reopen_atomic_v1_schema_reload.sql`
  - `20260330230800_request_reopen_atomic_v1_item_reset.sql`

### Why canonical

- Submit and reopen are already server-owned lifecycle transitions.
- Current repo callers explicitly target these functions.
- Later migrations in the chain are hotfixes/guard hardening, not new semantic versions.

### Legacy / compatibility notes

- No older `v0`/`v2` repo caller family exists in the current tree.
- The migration chain itself is the history that must be preserved.

### Do not squash / rewrite

- Do not squash any migration inside either lifecycle chain.
- Do not reintroduce direct client lifecycle writes around submit/reopen.

## Proposal Creation Boundary Chain

### Family

- Proposal create+submit atomic boundary

### Canonical runtime version

- `public.rpc_proposal_submit_v3`

### Active repo caller

- `src/lib/catalog/catalog.proposalCreation.service.ts`

### Active migration chain

- `20260330200000_proposal_creation_boundary_v3.sql`
- `20260330201500_proposal_creation_boundary_v3_uuid_cast_fix.sql`
- `20260330203000_proposal_creation_boundary_v3_enum_cast_fix.sql`
- `20260330204500_proposal_creation_boundary_v3_price_regex_fix.sql`
- `20260330205500_proposal_creation_boundary_v3_proposal_id_cast_fix.sql`
- `20260330210000_proposal_creation_boundary_v3_request_id_cast_fix.sql`
- `20260330211500_proposal_creation_boundary_v3_proposal_item_uuid_fix.sql`
- `20260330213000_proposal_creation_boundary_v3_request_item_uuid_fix.sql`
- `20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql`

### Why canonical

- `v3` is the active server boundary used by the client today.
- The chain encodes multiple production fixes without changing the public version name.
- Current caller ownership is already centralized around the `v3` RPC.

### Legacy / compatibility notes

- Older proposal submission versions are not active repo callers in this tree.
- The debt here is repeated full-body redeploys inside the same family, not caller ambiguity.

### Do not squash / rewrite

- Do not squash the `proposal_creation_boundary_v3` chain.
- Any future fix must explicitly state why a full-body redeploy is unavoidable.

## Accounting Finance Chain

### Family

- Canonical accountant finance reads + atomic payment mutation

### Canonical runtime versions

- `public.accountant_inbox_scope_v1`
- `public.accountant_proposal_financial_state_v1`
- `public.accounting_pay_invoice_v1`
- `public.guard_paid_proposal_financial_revocation_v1`

### Active repo callers

- `src/screens/accountant/accountant.inbox.service.ts`
- `src/lib/api/accountant.ts`
- documented transition map in `docs/architecture/accounting-finance-transition-map.md`

### Active migration chain

- `20260326195000_accountant_inbox_scope_v1.sql`
- `20260330110000_financial_atomic_rpc_v1.sql`
- `20260330121500_financial_paid_proposal_guard_v1.sql`
- `20260331110000_accounting_canonical_finance_chain_v1.sql`

### Why canonical

- The inbox read, proposal financial read, and pay mutation are the current server-owned finance truth.
- The later `accounting_canonical_finance_chain_v1` migration keeps the inbox scope aligned with the canonical finance model.

### Legacy / compatibility notes

- No older active repo caller family is present for the finance mutation path.
- The chain must stay readable as a sequence of inbox introduction -> atomic mutation -> guard -> canonical alignment.

### Do not squash / rewrite

- Do not squash this chain into one migration.
- Do not move finance truth back into client-side recalculation.

## Attachment Evidence Boundary

### Family

- Proposal attachment evidence write/read boundary

### Canonical runtime versions

- `public.proposal_attachment_evidence_attach_v1`
- `public.proposal_attachment_evidence_scope_v1`

### Active repo callers

- `src/lib/api/proposalAttachmentEvidence.api.ts`
- `src/lib/api/proposalAttachments.service.ts`
- accountant/buyer/director attachment readers downstream

### Active migration chain

- `20260331130000_attachment_evidence_boundary_v1.sql`

### Why canonical

- This is the active server-owned attachment evidence boundary for proposal-linked files.
- Direct table access has already been demoted from primary truth.

### Legacy / compatibility notes

- Compatibility table reads still exist in selected fallback paths, but they are not canonical.

### Do not squash / rewrite

- Do not restore direct table insert/read as primary behavior.

## Subcontracts Hardening Chain

### Family

- Shared subcontract create / approve / reject boundary

### Canonical runtime versions

- `public.subcontract_create_v1`
- `public.subcontract_approve_v1`
- `public.subcontract_reject_v1`

### Active repo caller

- `src/screens/subcontracts/subcontracts.shared.ts`

### Active migration chain

- `20260401100000_subcontracts_hardening_v1.sql`
- `20260401110000_subcontracts_rollout_fix_fn_next_subcontract_number.sql`

### Legacy / compatibility notes

- `public.subcontract_create_draft` remains compatibility-only fallback.
- The rollout fix migration adds helper support, not a new public subcontract version.

### Why canonical

- `*_v1` functions are the current primary create/status mutation path.
- Approve/reject are now server-owned atomic RPCs.
- Shared caller ownership is centralized in one module.

### Do not squash / rewrite

- Do not restore direct client approve/reject.
- Do not promote `subcontract_create_draft` back to primary behavior.
- Do not treat the rollout helper migration as version `v2`.
