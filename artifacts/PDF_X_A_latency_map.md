# PDF-X.A Latency And Pressure Map

Baseline: `de3b2effe760c661c717daf39e85f480bcb38c18`

Mode: read-only audit.

## Shared Latency Chain

The current PDF system has four recurring latency sources:

1. Source load and aggregation: RPCs, raw table reads, grouping, joins, totals, and read-model construction.
2. Payload shaping: TypeScript adapters/builders convert source rows into PDF-specific models.
3. HTML/PDF render: HTML assembly plus local print or Edge/Puppeteer.
4. Open/share boundary: signed URL, local file, native viewer, web viewer, or browser blob.

The user-visible click delay is worst when all four run synchronously from a cold click and the result is not reused.

## Path Latency Findings

| ID | Cold click path | Main pressure | Repeated click behavior | Latency risk |
| --- | --- | --- | --- | --- |
| `director_reports_production_pdf` | Click -> Edge function -> `pdf_director_production_source_v1` -> materials + works report source -> TypeScript model -> HTML -> Puppeteer -> storage upload -> signed URL -> viewer. | DB/report aggregation plus Edge/Puppeteer. The screen may already have report data, but PDF backend re-fetches its own source. | No durable source or artifact reuse observed; repeated click can re-run source and render. | Critical |
| `warehouse_material_pdfs` | Click -> `warehouse-pdf` Edge route -> material report RPC -> HTML -> Puppeteer -> storage upload -> signed URL -> viewer. | DB aggregation over material ranges plus Edge/Puppeteer. | New render per request; no durable artifact cache. | High |
| `warehouse_object_work_pdf` | Click -> `warehouse-pdf` Edge route -> `pdf_warehouse_object_work_source_v1` -> HTML -> Puppeteer -> storage upload -> signed URL -> viewer. | DB object/work grouping plus Edge/Puppeteer. | New render per request; no durable artifact cache. | High |
| `director_finance_supplier_summary_pdf` | Click -> Edge supplier summary function -> `pdf_director_finance_source_v1` -> filter/group supplier-kind data -> HTML -> Puppeteer -> storage upload -> signed URL. | Finance source fetch plus per-supplier grouping plus Edge/Puppeteer. | New backend render path per cold click; no durable artifact cache. | High |
| `director_finance_management_pdf` | Cold path: scope -> `pdf_director_finance_source_v1` -> TypeScript model -> canonical HTML -> Edge render -> storage signed URL. Hot path: panel prefetch/prerender can warm source/render caches. | Cold DB source and Edge/Puppeteer. | Short source cache and HTML-hash render cache can make later click fast; no data-version invalidation. | Medium-high |
| `director_reports_subcontract_pdf` | Click -> Edge function -> `pdf_director_subcontract_source_v1` -> model/HTML -> Puppeteer -> storage signed URL. | DB report source plus Edge/Puppeteer. | No durable artifact reuse. | Medium-high |
| `warehouse_register_pdfs` | Click -> `warehouse-pdf` Edge route -> register RPC -> HTML -> Puppeteer -> signed URL. | DB register source plus Edge/Puppeteer, range dependent. | No durable artifact reuse. | Medium-high |
| `accountant_payment_order_pdf` | Click -> `pdf_payment_source_v1` RPC -> client payload shaping -> HTML -> local/native render. | DB source and local render. | No artifact reuse. Payment scope is usually narrower. | Medium |
| `contractor_act_pdf` | Click -> contractor source RPC or fallback raw reads -> client model -> HTML -> local/native render. | RPC source path is acceptable; fallback can push raw aggregation to client. | No artifact reuse. | Medium |
| `director_proposal_pdf` | Click -> raw proposal/request/reference reads -> client joins/mapping -> HTML -> local/native render. | Client-side joins and local render. | Rebuilds on repeat. Dataset is usually bounded by proposal size. | Medium |
| `buyer_proposal_pdf` | Click -> proposal source path or buyer fallback -> client mapping -> local render. | Client mapping and fallback raw joins. | Rebuilds on repeat. | Medium |
| `accountant_proposal_pdf` | Click -> proposal source path -> client mapping -> local render. | Client mapping and local render. | Rebuilds on repeat. | Medium-low |
| `director_request_pdf` | Click -> request/items/reference reads -> client model -> HTML -> local/native render. | Client reads/mapping; bounded single request. | Rebuilds on repeat. | Low-medium |
| `foreman_request_pdf` | Click -> Edge function reads one request/items/references -> HTML -> Puppeteer -> signed URL. | Edge render; data scope is one request. | Rebuilds on repeat. | Low-medium |
| `foreman_history_request_pdf` | Same as `foreman_request_pdf`, triggered from history row. | Edge render; bounded source. | Rebuilds on repeat. | Low-medium |
| `warehouse_issue_form_pdf` | Click -> `warehouse-pdf` Edge route -> one issue document source -> HTML/Puppeteer. | Edge render; bounded document source. | Rebuilds on repeat. | Low-medium |
| `warehouse_incoming_form_pdf` | Click -> `warehouse-pdf` Edge route -> one incoming document source -> HTML/Puppeteer. | Edge render; bounded document source. | Rebuilds on repeat. | Low-medium |
| `reports_dashboard_pdf_export` | Click -> existing in-memory report rows -> HTML -> local/native render. | HTML/local render only after report data already loaded. | Rebuilds local PDF, but avoids source fetch on click. | Low |
| `accountant_remote_attachment_pdf` | Open existing remote document URL. | Viewer/open only. | Depends on URL/file caching outside this audit. | Low |
| `warehouse_legacy_report_pdf_service` | Legacy client render service; not the primary active UI path. | Local render if called. | No durable artifact reuse. | Low |

## Cache And Freshness Map

| Cache layer | Current users | What it solves | What it does not solve |
| --- | --- | --- | --- |
| Client source cache | Director finance source cache, director report transport screen data cache. | Avoids some repeated source fetches inside a short TTL. | Does not define durable source version, artifact freshness, or invalidation. Backend PDF functions can still re-fetch. |
| Render cache by HTML hash | Director canonical render service. | Reuses signed URL for identical HTML within a short window. | Hash is derived after source/model work. It is not a data freshness contract and is not shared across all PDF paths. |
| Storage object upload | Edge-rendered PDF paths. | Gives a signed URL for current render. | Most functions create timestamp/nonce paths, so storage is materialization without reuse policy. |
| Local URL/file reuse | Runner/open boundary for some web/native flows. | Avoids some repeated file conversion/open work. | It does not reduce upstream report aggregation or Edge render pressure. |

## CPU Killer Ranking

1. `director_reports_production_pdf`: combines broad production report source, materials and works domains, Edge adaptation, HTML, Puppeteer, upload, and no durable reuse.
2. `warehouse_material_pdfs` and `warehouse_object_work_pdf`: report-like warehouse aggregations plus Edge/Puppeteer on click across potentially broad date/object scopes.
3. `director_finance_supplier_summary_pdf`: uses the director finance source then filters/groups and renders per supplier/kind without durable artifact reuse.
4. `director_finance_management_pdf`: still heavy on cold path, but current speculative source/render warming lowers the immediate click risk.
5. Client proposal/contractor/payment PDFs: bounded or already partially summary-first, but still lack artifact policy and can block local render on slower devices.

## Viewer Boundary Finding

No evidence points to `pdf-viewer` as the top architectural bottleneck. The viewer should remain downstream. The next implementation wave should remove report-source and render work from the cold click path for one top PDF family before any viewer refactor is considered.
