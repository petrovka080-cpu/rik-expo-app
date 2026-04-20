# PDF-Z3.0 Remaining Role Latency / Bottleneck Map

Status: GREEN audit artifact.

Baseline: `4b6c9b6a531a384d14cd6b59ce1358e7a6b40373`

Mode: read-only. This map uses existing runtime proof artifacts plus code-path inspection; it does not launch a new implementation wave.

## Evidence Inputs

- `artifacts/PDF_Z3_0_selection.md` contains direct `warehouse-pdf` Edge Function selection measurements from the Z3 wave.
- `artifacts/PDF_Z3_exec_summary.md` proves `incoming_register` is already fixed: warm median `150 ms`, repeat median `137 ms`, backend calls `0`.
- `artifacts/PDF_Z4_exec_summary.md` proves Foreman request repeat/warm is already fixed: warm median `213 ms`, repeat median `207 ms`.
- `artifacts/PDF_Z5_exec_summary.md` proves Contractor act same-version local render reuse and concurrency are already fixed by tests/proof.
- Current code inspection confirms Warehouse manifest logic is still limited to `incoming_register`. `src/lib/api/warehousePdfBackend.service.ts:59`, `src/lib/pdf/warehousePdf.shared.ts:155`

## Warehouse Measured Remaining Candidates

Existing Z3 selection probe measured all main Warehouse candidates before selecting and fixing `incoming_register`.

| Candidate | Document kind | Status at selection | Elapsed |
| --- | --- | --- | --- |
| Incoming register, all period | `incoming_register` | Shipped in `PDF.Z3`; no longer remaining | `13772 ms` |
| Issue register, all period | `issue_register` | Remaining | `12472 ms` |
| Issue materials, all period | `issue_materials` | Remaining | `12144 ms` |
| Object/work report, all period | `object_work` | Remaining | `11073 ms` |
| Incoming materials, all period | `incoming_materials` | Remaining | `10390 ms` |

## Per-Role Bottleneck Map

| Role | Top-1 path inside role | Source load | Aggregation / adaptation | HTML / render | Upload / open | Repeat / warm behavior | Bottleneck verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Warehouse | `issue_register` | `warehouse-pdf` calls `acc_report_issues_v2`. `supabase/functions/warehouse-pdf/index.ts:279`, `supabase/functions/warehouse-pdf/index.ts:709` | Register source is adapted in Edge for the all-period issue register. | `buildWarehouseIssuesRegisterHtml`. `supabase/functions/warehouse-pdf/index.ts:816` | Edge render/upload/sign on cold path. | No Z3 manifest/reuse branch for `issue_register`; only `incoming_register` has manifest/cache. `src/lib/api/warehousePdfBackend.service.ts:59` | Global top remaining blocker: measured `12472 ms`, repeated cold path, no deterministic artifact. |
| Foreman | `foreman_request_pdf` / history request | Backend source in `foreman-request-pdf`. `src/lib/api/foremanRequestPdfBackend.service.ts:191` | Bounded single request adaptation. | Edge render. | Signed remote URL. | `PDF.Z4` repeat/warm already within SLA; Android was environment-blocked only. | Not next: the repeat/warm bottleneck is closed. |
| Purchaser / Buyer | `buyer_proposal_pdf` | Client/shared proposal source reads proposal head/items/request/reference data. `src/lib/api/pdf_proposal.ts:188`; fallback reads in `src/screens/buyer/buyerPdf.ts:31` | Client-side row enrichment, supplier/reference lookup, fallback model build. | Local HTML -> `renderPdfHtmlToUri`. `src/lib/api/pdf_proposal.ts:403`, `src/screens/buyer/buyerPdf.ts:128` | Shared preview. | No manifest/artifact. Repeat can rebuild proposal source/render. | Real cross-role risk, but no existing measurement beats the Warehouse `12472 ms` path. |
| Accountant | `accountant_payment_order_pdf` | Canonical RPC `pdf_payment_source_v1`. `src/lib/api/paymentPdf.service.ts:503` | TS validation and payment allocation shaping. `src/lib/api/paymentPdf.service.ts:540`, `src/lib/api/paymentPdf.service.ts:821` | Local payment PDF render through `exportPaymentOrderPdfContract`. `src/lib/documents/pdfDocumentGenerators.ts:46`, `src/lib/api/pdf_payment.ts:18` | Shared preview. | No artifact manifest/cache; source contract is already centralized. | Money-critical but technically less fragmented than Buyer proposal and not measured above Warehouse. |
| Contractor | `contractor_act_pdf` | RPC `loadContractorWorkPdfSourceViaRpc`, then client fallback on failure. `src/screens/contractor/contractor.pdfService.ts:92`, `src/screens/contractor/contractor.pdfService.ts:162` | Work/material aggregation in fallback path. `src/screens/contractor/contractor.pdfService.ts:113`, `src/screens/contractor/contractor.pdfService.ts:196` | Local render in `renderContractorActPdfDocument`. `src/screens/contractor/contractorPdf.render.ts:159` | Shared contractor preview. | `PDF.Z5` added deterministic manifest/local reuse and in-flight coalescing. `src/screens/contractor/contractorPdf.render.ts:162`, `src/screens/contractor/contractorPdf.render.ts:204` | Not next for latency: repeat-render risk is closed; remaining source fallback hardening is lower priority than measured Warehouse. |

## No False Viewer Blame

The selected blocker is upstream of the viewer:

1. `onPdfRegister` builds an `issue_register` request. `src/screens/warehouse/warehouse.pdfs.ts:193`
2. Client calls `generateWarehousePdfViaBackend`. `src/screens/warehouse/warehouse.pdfs.ts:99`
3. Backend invokes `warehouse-pdf`. `src/lib/api/warehousePdfBackend.service.ts:199`
4. Edge loads report source, builds HTML, renders, uploads, and signs.
5. Only after that does the viewer receive a remote URL.

The viewer/open path is not the root cause for `issue_register`; missing manifest/artifact reuse is.
