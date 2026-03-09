# Phase F0 Inventory: Work Types & Estimate Fields

This package is **audit-only**. No logic, formulas, basis keys, or UI behavior were changed.

## Source of truth used
- Work types in UI: `src/components/foreman/WorkTypePicker.tsx` -> `v_work_types_picker`
- Calculator fields in UI: `src/components/foreman/useCalcFields.ts` -> `v_reno_calc_fields_ui` / `v_reno_calc_fields_ui_clean`

## Inventory counts
- Work types: **173**
- Total field rows: **404**
- Unique basis keys: **36**
- Mismatch-marked rows: **351**
- Work types with no fields in views: **3**

## Deliverables
- `work-types.csv` — full list of all work types
- `work-type-fields-matrix.csv` — full matrix by work type and field
- `basis-key-usage-matrix.csv` — grouped basis key usage slice
- `preliminary-mismatch-report.csv` — suspicious rows only (no fixes)
- `work-type-structure-groups.csv` — structural grouping by field signatures
- `core-secondary-derived-fields.csv` — analytical split of field roles
- `inventory-package.json` — metadata, counts, no-field work types

## Preliminary mismatch flags used
- `OK`
- `DUPLICATE_PATTERN`
- `LABEL_MISMATCH`
- `UOM_MISMATCH`
- `POSSIBLE_WRONG_FIELD`
- `NEEDS_REVIEW`

## Mismatch flag totals (row-level, additive)
- DUPLICATE_PATTERN: **351**
- LABEL_MISMATCH: **351**
- NEEDS_REVIEW: **351**

## Notes and limits
- `family_name_ru` is sourced from `family_short_name_ru` in `v_work_types_picker`.
- Work type active status was not exposed by `v_work_types_picker` in this dataset.
- Formula/expression/config IDs were not exposed by UI views and are left blank in matrix output.
- This is a factual extraction baseline for Phase F1 normalization, not a normalization step.

## Proposal for next phase (F1, after review)
1. Freeze mapping of `basis_key -> engineering semantic role` per work family.
2. Resolve `LABEL_MISMATCH` rows where same key has conflicting labels across families.
3. Resolve `UOM_MISMATCH` rows where key and unit are semantically inconsistent.
4. Review `POSSIBLE_WRONG_FIELD` rows manually with domain owner before any UI changes.
5. Only after approved mapping, update labels/hints in config source and run regression audit.
