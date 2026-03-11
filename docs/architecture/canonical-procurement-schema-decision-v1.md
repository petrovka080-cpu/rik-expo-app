# Canonical Procurement Schema Decision v1

Date: 2026-03-09

## Goal
Fix canonical procurement typing and counterparty binding at DB level without breaking current request/proposal/approve/purchase flows.

## Part A — Current Schema Audit

### A1. Request layer (`request_items`)
- Observed fields in active client usage:
  - `id`, `request_id`, `name_human`, `qty`, `uom`, `status`, `app_code`, `rik_code`, `note`, `supplier_hint`, `kind`.
- Evidence:
  - `src/lib/api/buyer.ts` maps `request_items.kind` into buyer inbox rows.
  - `src/lib/catalog_api.ts` reads and writes `request_items` and preserves `kind` in multiple catalog/search pathways.
- Conclusion:
  - Canonical type candidate already exists at request line level via `request_items.kind`.

### A2. Proposal layer (`proposal_items`)
- Observed fields in active write/read flows:
  - `proposal_id`, `request_item_id`, `supplier` (text), `price`, `qty`, `note`.
- Evidence:
  - `src/lib/catalog_api.ts` creates proposal rows by `proposal_id + request_item_id` and snapshots meta with `supplier` text.
  - `src/screens/buyer/buyer.repo.ts` reads `proposal_items` with `request_item_id, qty, price, supplier, note`.
- Missing canonical fields:
  - `supplier_id` does not exist.
  - `contractor_id` does not exist.
- Runtime DB probe:
  - `proposal_items.supplier_id` -> `column does not exist`.
  - `proposal_items.contractor_id` -> `column does not exist`.

### A3. Purchase layer (`purchase_items`)
- Active client logic depends on:
  - `request_item_id` linking (used in director reports and contractor/warehouse integrations).
- Explicit procurement type fields not observed in client paths.
- DB probe confirms:
  - `purchase_items.kind` missing.

### A4. Counterparty binding
- Buyer currently stores a free-text counterparty (`supplier`) in proposal item meta.
- Buyer UI now has type-gate (`material -> supplier`, `service/work -> contractor`) but persists to text field for backward compatibility.
- Contractor relation exists in other domains (`subcontracts`, buyer subcontract tab), but not in `proposal_items` canonical line schema.

### A5. Ambiguity points
- Item type often inferred from mixed sources (`kind`, `app_code`, `rik_code` prefixes).
- No DB-enforced invariant preventing invalid combination of item type and counterparty role.
- No stable entity FK binding at proposal line stage.

## Part B — Canonical Target Model

### B1. Canonical typed field
- Introduce `procurement_kind` with strict domain:
  - `material`, `service`, `work`.
- Canonical ownership by stage:
  - `request_items.procurement_kind`: source typing.
  - `proposal_items.procurement_kind`: copied from request line at proposal creation.
  - `purchase_items.procurement_kind`: copied from approved proposal/request line.

### B2. Counterparty binding fields
- Add to `proposal_items`:
  - `supplier_id uuid null`
  - `contractor_id uuid null`
- Preserve legacy `supplier` text for compatibility during migration.

### B3. Required invariants (hard target)
- `procurement_kind = 'material'`:
  - `supplier_id is not null`
  - `contractor_id is null`
- `procurement_kind in ('service','work')`:
  - `contractor_id is not null`
  - `supplier_id is null`
- `request_item_id is not null` remains mandatory for canonical proposal line linkage.

### B4. Constraint strategy
- Add enum or check constraint:
  - `check (procurement_kind in ('material','service','work'))`.
- Add role-binding check constraint:
  - conditional FK nullability by `procurement_kind`.
- Add FK constraints:
  - `supplier_id -> suppliers.id`
  - `contractor_id -> contractors.id` (or canonical contractor table chosen for procurement domain).

## Part C — Existing Data Compatibility Audit

### C1. Live environment probe (current anon role)
- `requests`, `request_items`, `proposal_items`, `purchases`, `purchase_items`, warehouse fact tables all readable with zero rows in current environment.
- `proposals` denied for anon role (`42501 permission denied`).
- Result:
  - Data volume/sample for classification in this environment: `0` rows.

### C2. Classifiability status
- From schema/code perspective:
  - Lines with explicit `kind` are directly classifiable.
  - Lines without `kind` can be tentatively mapped from `app_code/rik_code` prefixes.
- In current environment, actual row-level distribution unavailable because operational data is empty and proposal headers are RLS-protected.

### C3. Compatibility risk
- Real migration risk must be measured in privileged environment (service role / DBA) before strict constraints.
- Required pre-migration report (mandatory):
  - total rows by stage
  - rows with `kind` present
  - rows requiring fallback mapping
  - rows remaining ambiguous after fallback

## Part D — Safe Migration Plan

### Phase 0 (Read-only audit)
- Add SQL audit script only:
  - classify existing rows into `typed`, `mapped_by_code`, `ambiguous`.
  - export ambiguous row IDs for remediation list.
- No writes, no behavior changes.

### Phase 1 (Additive schema, soft mode)
- Add nullable columns:
  - `request_items.procurement_kind` (if not already canonicalized from `kind`)
  - `proposal_items.procurement_kind`, `proposal_items.supplier_id`, `proposal_items.contractor_id`
  - `purchase_items.procurement_kind`
- Add non-blocking triggers/default mappers:
  - populate new fields from existing `kind`/mapping table.
- Keep legacy text fields and old read paths intact.

### Phase 2 (Dual-write + canonical-prefer reads)
- Client/API writes both old and new fields.
- Read paths prefer canonical fields; fallback to legacy only with explicit logging.
- Add soft validation warnings on invalid combinations.

### Phase 3 (Strict enforcement)
- Enable strict DB checks for kind/binding invariants.
- Reject invalid writes at DB boundary.
- Keep legacy fields read-only compatibility for one deprecation window.

### Phase 4 (Optional cleanup)
- Remove fallback logic after stability window and reconciliation sign-off.
- Deprecate legacy text-only counterparty fields if no longer needed.

## Part E — Approval / Purchase Integrity

### E1. Stage transitions
- `request_items` typed line -> `proposal_items` typed line + bound entity -> approval -> `purchase_items` typed line.

### E2. Idempotency requirements
- Approval/materialization must be idempotent by canonical business key:
  - `(proposal_id, request_item_id)` for proposal stage.
  - deterministic mapping to purchase facts per approved line.

### E3. Duplicate prevention expectations
- Re-approve/retry must not create duplicate purchase/incoming facts for same canonical line.
- Warehouse/accounting fact stages must consume only approved procurement facts once.

## Risks
- RLS visibility limits can hide true production compatibility profile.
- Mixed historical typing conventions (`kind`, code-prefix heuristics) may leave ambiguous legacy lines.
- Enforcing strict constraints before backfill/remediation can block operational writes.

## Recommended Rollout Order
1. Privileged data audit SQL in target production-like DB.
2. Additive columns + dual-write adapters.
3. Canonical-read preference rollout.
4. Strict constraints after ambiguity backlog is zero.
5. Legacy fallback removal.

## Final Verdict
`READY FOR ADDITIVE MIGRATION DESIGN`

Condition:
- before strict constraints, run privileged data-compatibility audit in the real operational dataset.
