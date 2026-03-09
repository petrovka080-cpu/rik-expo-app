## Director Canonical SQL Blueprint Remediation v1

### Fixed items
- P0-1 RPC contract mismatch
  - Fixed in `db/20260309_director_canonical_reports_sql_blueprint_v2_draft.sql`:
    - `director_report_fetch_works_v1` now returns `table(payload jsonb)` with runtime-compatible nested shape.
    - `director_report_fetch_materials_v1` now returns `table(payload jsonb)` with runtime-compatible payload shape.
    - `director_report_fetch_summary_v1` aligned to JSON payload style.
- P0-2 `unevaluated_ratio` mismatch
  - Replaced placeholder formula with runtime-equivalent base:
    - denominator: priced-base issue positions (`qty > 0` and code present),
    - numerator: same positions with missing price-derived issue cost (`issue_cost <= 0`).
  - Formula documented in blueprint doc.
- P1-1 company loss risk for free/unlinked rows
  - Company anchor changed to `coalesce(wi.company_id, req.company_id)`.
  - Explicit note added: rows with no company source are intentionally non-scopable and must be documented.
- P1-2 aggregation grain mismatch
  - Works RPC now reconstructs runtime semantic grain (`work -> level -> materials`) from flat facts.
  - Grain model documented explicitly (runtime grain, base grain, report grain).
- P1-3 row explosion risk on code joins
  - Added deterministic dedup layers:
    - `v_ref_systems_one_v1`
    - `v_ref_levels_one_v1`
    - `v_ref_zones_one_v1`
    - `v_rik_name_one_v1`
    - `v_catalog_item_one_v1`
  - Fact views join against dedup layers only.

### Remaining gaps
- `stock_qty` remains provisional (`0`) until approved stock source is connected.
- `purchase_cost_total` in works remains conservative by design (`0`) to preserve current runtime semantics and avoid reintroducing invalid heavy branches.
- `work_type_code` lineage for legacy/free rows remains fallback-driven and requires optional future normalization layer (non-blocking for current parity target).

### Why logic was preserved
- Requested/free semantics remain linked to `request_item_id` presence exactly as runtime.
- Costs remain proposal-price based for issue valuation in works/materials.
- No runtime cutover introduced; this is blueprint remediation only.
- No formula simplification introduced; `unevaluated_ratio` now explicitly mirrors runtime intent.

### Files changed
- `db/20260309_director_canonical_reports_sql_blueprint_v2_draft.sql`
- `docs/architecture/director-canonical-reports-sql-blueprint-v1.md`
- `docs/architecture/director-canonical-sql-blueprint-remediation-v1.md`

### Validation
- Semantic validation:
  - works RPC contract совместим с runtime ожиданием payload shape — YES (draft contract updated)
  - `unevaluated_ratio` semantics aligned to runtime base — YES
  - free/unlinked company handling explicit and non-silent — YES
  - aggregation grain parity restored for works payload — YES
  - deterministic join strategy documented and encoded — YES
- Technical validation:
  - `npx tsc --noEmit --pretty false` — PASS
  - SQL lint/parse — not executed in this remediation (draft-only SQL artifact)

### Verdict
- PASS WITH GAPS

