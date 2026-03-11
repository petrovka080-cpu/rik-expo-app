## Director Obligations Canonical Surface v1

### Objective
- Build one director reporting surface for approved obligations only.
- Keep existing UI/runtime paths intact (no cutover, no deletion of legacy paths).
- Prevent request/proposal/procurement triple counting by using one reporting grain:
  - `approved procurement decision`.

### Source map
- **Materials + supplier works/services (approved decision layer):**
  - `public.v_director_finance_spend_kinds_v3`
  - used today in director finance flows (`finSpendRows`) with fields:
    - `proposal_id, supplier, kind_code, kind_name, approved_alloc, paid_alloc(_cap), director_approved_at`.
  - canonical obligations includes only director-approved rows with positive approved amount.
- **Object resolution for proposal-linked supplier rows:**
  - `public.proposal_items -> public.request_items -> public.requests`
  - proposal-level object inferred from linked request object fields.
- **Subcontracts:**
  - `public.subcontracts`
  - includes only `status = approved` rows with non-empty `contractor_org`, non-empty `object_name`, positive `total_price`.

### Unified schema
- `obligation_type`: `material | work_supplier | service_supplier | subcontract`
- `source_origin`: `finance_supplier | subcontract`
- `source_id`
- `company_id` (currently nullable in draft; see Proven gaps)
- `counterparty_name`
- `object_name`
- `work_or_category`
- `amount_approved`
- `amount_paid`
- `amount_due`
- `status`
- `approved_at`
- `created_at`

### Implemented additive draft artifacts
- SQL view:
  - `public.v_director_obligations_facts_v1`
- SQL RPC:
  - `public.director_report_fetch_obligations_v1(p_from, p_to, p_object_name, p_obligation_type)`
  - returns JSON with:
    - `summary`
    - `by_type`
    - `by_object`
    - `by_counterparty`
    - `rows`

### Inclusion rules (approved decision only)
- Include row only when all conditions are true:
  - counterparty is present
  - approved amount > 0
  - object is present
  - director-approved signal exists (`director_approved_at` for supplier contour, `status=approved` for subcontracts)
  - status is not draft/rejected

### Double-count protection
- Obligations surface excludes request-level and warehouse movement-level planning/fact rows.
- Obligation grain = approved decision row, not request row.
- Reporting layers stay separated:
  - planning: requests
  - obligations: approved decisions
  - fact: payments/warehouse movements

### Proven gaps
- **G1 (P0 for full production obligations):** `company_id` is not yet guaranteed for all subcontract rows (current subcontract table model is user-scoped without explicit company FK in current migrations).
- **G2 (P1):** subcontract `amount_paid` is not linked in current source map; draft uses `amount_paid = 0`, `amount_due = amount_approved`.
- **G3 (P1):** supplier contour object attribution is inferred through proposal/request linkage and may be null when linkage is broken.
- **G4 (P1):** `source_origin=warehouse` is intentionally excluded here to avoid double count with approved decision rows.

### Additional audit: materials `Без объекта`
- Distinguish:
  - **true source missing:** object truly absent in request/issue source;
  - **propagation loss:** object present upstream but lost in reporting join/mapping.
- In this obligations surface, rows without object are excluded by rule (`has_object=true`).
- Separate data-quality audit should list:
  - count of truly missing source rows,
  - count of propagation-loss rows,
  - exact join path where loss happens.

### Safe integration plan
1. Keep current director finance/reports runtime unchanged.
2. Deploy obligations view/RPC as additive, behind flag/capability.
3. Run parity checks for:
   - approved totals by type,
   - paid/due totals by supplier,
   - object totals.
4. Enable read-only internal obligations screen/report first.
5. Expand usage after gap closure (`company_id`, subcontract paid linkage).

### Verdict
- **NEEDS SOURCE FIXES FIRST**
  - surface is ready as additive diagnostic/preview layer,
  - but full production obligations report needs company scoping and subcontract paid bridge finalized.

