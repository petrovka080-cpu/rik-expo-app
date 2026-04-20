# PDF-Z0.2 Compute Location / Latency Map

Status: GREEN audit artifact.

Baseline: `a105e8738e55d4a81f20c1031e5c1b1147578fc8`

Mode: read-only. This file names current pressure points and target ownership; it does not change code.

## Layer Model

| Layer | Meaning | Desired ownership in top PDF model |
| --- | --- | --- |
| Raw source load | Tables/RPC/Edge source reads | DB/RPC/read model, not viewer |
| Aggregation | totals, grouping, filtering, bucketing | DB projection or stable backend summary for heavy families |
| Adaptation | current source shape to PDF model | Backend or thin client pass-through; no duplicate formulas |
| HTML assembly | template string/model rendering | Kept versioned and deterministic |
| Render engine | Expo print, browserless/Puppeteer, local render | Backend for heavy/canonical remote docs; local only for small on-demand docs |
| Upload/sign | storage upload, signed URL generation | Backend artifact layer with deterministic version for Tier 1 |
| Open/share | document actions, viewer, native handoff | Client opens prepared source; no raw compute |
| Viewer/bootstrap | route/session/WebView/native preview | Should stay thin; not the root cause for aggregation-heavy paths |

## Per-Family Latency Map

| PDF family | Raw source load | Aggregation/adaptation | HTML/render | Upload/open | What should remain on demand | What should move to summary/projection or artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `director_request_pdf` | Client request/items reads | Small request model | Local HTML/render | Local preview | All current work is acceptable unless volume changes | None now |
| `director_proposal_pdf` | Client proposal/items/request/reference reads | TS grouping and totals | Local HTML/render | Local preview/share | Open/share only | Shared proposal summary source if proposal PDFs become frequent |
| `buyer_proposal_pdf` | Same proposal family plus buyer fallback reads | TS grouping and fallback adaptation | Local HTML/render | Local preview/upload flow | Open/share and small render | Shared proposal summary; remove fallback pressure later |
| `accountant_proposal_pdf` | Same proposal source | TS grouping | Local HTML/render | Local preview/share | Open/share | Shared proposal summary, not artifact-first |
| `accountant_remote_attachment_pdf` | Existing remote artifact | None | None | Viewer/download/open only | All current work | None |
| `accountant_payment_order_pdf` | RPC `pdf_payment_source_v1` | RPC contract plus TS contract validation | Local payment template/render | Local preview | Local render is acceptable unless hot | Optional artifact version if payment PDFs become high-frequency |
| `director_finance_management_pdf` | `pdf_director_finance_source_v1` via client service | Management report model built from finance source | HTML on client, Edge `director-pdf-render` on cold render | Random/signed artifact from generic renderer | Viewer/open and signed URL refresh | Source version, manifest row, deterministic artifact path, background materialization |
| `director_finance_supplier_summary_pdf` | Dedicated Edge calls `pdf_director_finance_source_v1` | Supplier/kind filtering and model in Edge | Edge HTML/render | Random/signed artifact | Signed URL refresh and small scoped reads | Source/artifact version and deterministic artifact reuse |
| `director_production_report_pdf` | Edge calls `pdf_director_production_source_v1` | Edge model adaptation | Edge HTML/render | Deterministic artifact after PDF-X.B1 | Sign existing artifact; cold render when artifact missing | Manifest/prewarm layer so client can read readiness before click |
| `director_subcontract_report_pdf` | Edge calls `pdf_director_subcontract_source_v1` | Edge model adaptation | Edge HTML/render | Random/signed artifact | Signed URL refresh | Source/artifact version plus deterministic artifact cache |
| `warehouse_issue_form_pdf` | Edge/source reads issue header/lines | Small single document | Edge render | Signed remote URL | Current on-demand work | None unless hot |
| `warehouse_incoming_form_pdf` | Edge/RPC incoming source | Small single document | Edge render | Signed remote URL | Current on-demand work | None unless hot |
| `warehouse_register_pdfs` | Edge/RPC report source by period/day | Register grouping | Edge render | Signed remote URL | Sign/open and maybe HTML render for small day docs | Period/day register summary source; artifact optional |
| `warehouse_material_pdfs` | Edge/RPC material source by period/day | Material grouping and totals | Edge render | Signed remote URL | Sign/open | Summary projection plus deterministic artifact for period reports |
| `warehouse_object_work_pdf` | Edge/RPC object/work source | Object/work/material grouping | Edge render | Signed remote URL | Sign/open | Summary projection plus deterministic artifact |
| `foreman_request_pdf` | Edge loads request/header/items/reference | Small request model | Edge render | Signed remote URL | Current backend on-demand work | None unless repeated opens are hot |
| `foreman_history_request_pdf` | Same as foreman request | Same | Same | Same | Current backend on-demand work | None now |
| `contractor_act_pdf` | RPC source when available; client fallback raw reads otherwise | Work/material aggregation, fallback is client-heavy | Local HTML/render | Local preview | Open/share | Make RPC summary/freshness authoritative; avoid fallback on hot paths later |
| `reports_dashboard_pdf_export` | Already-loaded dashboard report rows | In-memory export model | Local HTML/render | Local preview | Current export render | None unless saved scheduled reports appear |

## Top 3 Bottlenecks

1. `director_finance_management_pdf`
   - It is a critical Director report with existing source prefetch and HTML-hash render cache, which proves the path is hot enough to need mitigation.
   - The mitigation is session-local and not a true document lifecycle: no manifest, no backend artifact identity, no explicit source freshness contract.
   - A cold click can still perform finance source read, PDF model adaptation, HTML assembly, Edge render, upload, and sign.

2. `warehouse_material_pdfs` plus `warehouse_object_work_pdf`
   - These are report-scale families with repeated period/object/day scopes.
   - The backend boundary is clean, but it still renders/uploads on cold click and does not expose a readiness manifest or artifact version.
   - They are strong Tier 1 candidates after Director finance because they are broad and operationally frequent.

3. `proposal_pdf` shared family across Buyer, Director, and Accountant
   - Source preparation still fans out through client-side proposal/item/request/reference reads and fallback logic.
   - It is not the heaviest report family, but it has wide role exposure and inconsistent source behavior.
   - It should become summary-first before any viewer work is blamed.

## Viewer Assessment

The viewer/open chain should not be the first target. It can still have polish work later, but for heavy PDFs the main latency starts earlier:

- source load
- grouping/totals
- HTML assembly
- render engine
- upload/sign

The top architecture move is to make the client read a prepared manifest/artifact, not to hide source/render latency behind a faster click spinner.
