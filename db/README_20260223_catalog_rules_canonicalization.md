# Canonicalization: calculator rules + catalog

## Goal
Make `rik_code` identical across:
- calculator rule tables (`public.*` with `work_type_code` + `rik_code`)
- `catalog_items`
- `catalog_items_canon`

And remove catalog duplicates by canonical `rik_code`.

## Scripts
1. `db/20260223_catalog_rules_canonicalization_dry_run.sql`
2. `db/20260223_catalog_rules_canonicalization_apply.sql`
3. `db/20260223_catalog_rules_canonicalization_verify.sql`

## Run order
1. Run **dry-run** and review:
   - unresolved codes list
   - mapping preview
   - duplicate groups in `catalog_items`
2. Run **apply**.
3. Run **verify** (all checks should be clean).

## Notes
- Mapping contains:
  - manual map (known semantic aliases)
  - auto map (format variants: `_` vs `.` vs `,`)
- All updates are logged to `public.rik_code_alignment_audit`.
- `request_items.code` is re-synced from `request_items.rik_code`.

