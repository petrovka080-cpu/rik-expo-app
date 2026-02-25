# Smeta vs Catalog Code Alignment (2026-02-23)

## Goal
Make calculator-rule codes (`smeta`) identical to catalog codes to avoid runtime mismatches and UI/ledger conflicts.

## Files
- `db/20260223_smeta_catalog_code_alignment_dry_run.sql`
- `db/20260223_smeta_catalog_code_alignment_apply.sql`
- `db/20260223_smeta_catalog_code_alignment_verify.sql`

## Run order (mandatory)
1. Run **dry-run** in SQL editor and save result tables.
2. Review missing codes and discovered rule tables.
3. Run **apply**.
4. Run **verify** and confirm:
   - `missing_in_canon = 0`
   - no old alias codes remain in rule tables.

## Notes
- Scripts discover rule tables dynamically in `public` schema by presence of both columns:
  - `work_type_code`
  - `rik_code`
- Apply script inserts missing codes into `catalog_items_canon` from `catalog_items`.
- Apply script also normalizes known format aliases (underscore/comma/dot variants).
- All changes are logged to `public.rik_code_alignment_audit`.

## Safety
- Keep a DB backup/snapshot before `apply`.
- Run in staging first with production-like data.
