# PDF-Z3.0 Global Role Priority Selection

Status: GREEN audit artifact.

Baseline: `4b6c9b6a531a384d14cd6b59ce1358e7a6b40373`

Mode: read-only. This file selects one next implementation slice. It does not implement it.

## Selected Next Slice

Recommended implementation wave id: `PDF-Z6.WAREHOUSE_ISSUE_REGISTER`

If the owner wants to preserve the historical handoff label, this can be described as "next PDF implementation wave after PDF-Z3.0 audit"; do not reuse the already shipped `PDF.Z3` commit name in this repository.

| Field | Selection |
| --- | --- |
| Role | Warehouse |
| PDF family | `warehouse_register_pdfs` |
| Exact document kind | `issue_register` |
| Route / screen | Warehouse reports tab, issue mode, register PDF button |
| Client owner | `src/screens/warehouse/warehouse.pdfs.ts:193` |
| Backend client owner | `src/lib/api/warehousePdfBackend.service.ts:199` |
| Contract owner to extend | `src/lib/pdf/warehousePdf.shared.ts` |
| Edge owner | `supabase/functions/warehouse-pdf/index.ts` |
| Source owner | `acc_report_issues_v2`, called at `supabase/functions/warehouse-pdf/index.ts:279` |
| Render owner | `buildWarehouseIssuesRegisterHtml`, used at `supabase/functions/warehouse-pdf/index.ts:816` |
| Current missing production property | Durable manifest, deterministic `source_version`, deterministic `artifact_version`, artifact reuse, and same-version repeat hit for `issue_register` |

## Why This Slice Wins

1. It is the highest measured remaining candidate in existing Warehouse selection evidence: `12472 ms`.
2. The already fixed `incoming_register` path was the only higher measured Warehouse path and is no longer remaining.
3. Existing code limits the Z3 manifest/reuse branch to `incoming_register`, so `issue_register` still rebuilds as normal cold behavior.
4. Business impact is high because issue register is an outbound warehouse movement ledger, not a rare attachment preview.
5. Implementation can copy the shipped Z3 pattern without new architecture:
   - manifest/version contract in `warehousePdf.shared.ts`
   - deterministic artifact path in `warehouse-pdf`
   - client memory/persistent handoff in `warehousePdfBackend.service.ts`
   - `inFlight` registration before any manifest/cache/backend await
   - exact tests for version stability, hit/rebuild, concurrency, and no repeat rebuild

## Why Not The Other Slices First

| Candidate | Reason not first |
| --- | --- |
| Warehouse `incoming_register` | Already shipped in `PDF.Z3` and verified warm/repeat fast. |
| Warehouse `issue_materials` | Measured `12144 ms`, but lower than `issue_register`; keep next after register. |
| Warehouse `object_work` | Measured `11073 ms`; heavy and important, but not the measured top remaining offender. |
| Buyer/Purchaser proposal PDF | Wide exposure, but current evidence is source-fanout risk, not measured top latency. |
| Accountant payment order PDF | Money-critical, but canonical source RPC already exists; artifact cache can follow telemetry. |
| Contractor act PDF | `PDF.Z5` fixed same-version repeat render and concurrency; remaining source fallback is not top latency. |
| Foreman request/history PDF | `PDF.Z4` already fixed repeat/warm latency. |

## Scope Freeze For The Next Implementation Wave

Include only:

- Warehouse `issue_register`.
- Existing `warehouse-pdf` backend path for `issue_register`.
- Manifest/version/reuse/concurrency tests for this exact document kind.
- Web proof and Android proof or honest environment BLOCKED, following prior wave rules.

Exclude:

- `incoming_register` rework.
- `issue_materials`, `incoming_materials`, day materials, `object_work`.
- Warehouse single documents.
- Foreman, Contractor, Buyer/Purchaser, Accountant.
- Formula, totals, grouping, ordering, template, viewer, or broad UI changes.
