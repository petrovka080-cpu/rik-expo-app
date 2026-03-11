## Director Obligations Source Hardening v1

### Scope
- Hardening only (additive), no runtime cutover, no UI hookup.
- Legacy director reports/finance flows unchanged.
- Warehouse fact layer is not merged into obligations layer.

### Part A. Subcontract company binding
#### Proven source path
- Primary binding path for subcontract rows:
  - `subcontracts.id`
  - `requests.subcontract_id` (or `requests.contractor_job_id` legacy alias)
  - `requests.company_id`
- Binding rule:
  - if linked requests have exactly one distinct `company_id` -> bind as `company_id`
  - if multiple companies -> classify as `unmappable_multi_company_scope`
  - if no linked requests or no company_id -> classify as `unmappable_missing_company` / `unmappable_no_request_link`

#### Additive hardening implemented
- in SQL hardening draft:
  - [db/20260309_director_obligations_source_hardening_v1_draft.sql](c:\dev\rik-expo-app\db\20260309_director_obligations_source_hardening_v1_draft.sql)
  - `subcontract_scope` CTE derives company binding only from linked request scope.

#### Migration proposal (only if required later)
- If runtime needs strict non-null company for all subcontracts, add:
  - `subcontracts.company_id uuid null`
  - backfill from linked requests where deterministic
  - keep nullable rows for legacy records until manual resolution.

### Part B. Subcontract payment linkage
#### Payment source map result
- No confirmed dedicated subcontract payment surface found in current DB/sql layer.
- Existing payment surfaces are proposal/accountant-oriented and not linked by `subcontract_id`.

#### Safe rule for paid/due
- Current safe rule in hardening draft:
  - `amount_paid = 0`
  - `amount_due = amount_approved`
  - `payment_link_state = 'unsupported_no_subcontract_payment_surface'`

#### Rollout restriction
- Subcontract financial columns are **not parity-ready** for UI/PDF obligations totals that require paid/due truth.
- Allowed use at this stage:
  - internal read diagnostics only.

### Part C. Supplier dimensions quality
#### Audited dimensions
- `object_name`
- `work_or_category`
- `counterparty_name`
- `amount_approved`

#### Classification model
- `valid`
- `source_empty_*` (counterparty/object/work_or_category/amount/approval)
- `propagation_loss_object` (linked request scope exists but object is still missing)
- `unmappable_*` (no request link, missing company, multi-company conflict)

#### Additive hardening implemented
- canonical valid-only view:
  - `v_director_obligations_facts_v1` now keeps only `quality_class='valid'`
- audit view for all classes:
  - `v_director_obligations_source_audit_v1`
- audit RPC:
  - `director_report_fetch_obligations_source_audit_v1()`

### Files
- SQL hardening draft:
  - [20260309_director_obligations_source_hardening_v1_draft.sql](c:\dev\rik-expo-app\db\20260309_director_obligations_source_hardening_v1_draft.sql)
- Previous additive baseline:
  - [20260309_director_obligations_canonical_surface_v1_draft.sql](c:\dev\rik-expo-app\db\20260309_director_obligations_canonical_surface_v1_draft.sql)

### Readiness verdict
- **READY FOR INTERNAL READ PATH**
  - source semantics improved and explicitly audited.
- **NOT READY FOR UI/PDF**
  - subcontract paid linkage unsupported,
  - potential unresolved source-quality buckets require monitoring/cleanup.

