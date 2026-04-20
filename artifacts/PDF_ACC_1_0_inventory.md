# PDF-ACC-1.0 Accountant PDF / Reports Inventory

Wave mode: implementation wave after clean `PDF-PUR-1` release. Scope is accountant domain only.

## Accountant document actions

| Path | Screen / action | Source owner | Render/materialization owner | Open-path owner | Current reuse before PDF-ACC-1 | Bottleneck |
| --- | --- | --- | --- | --- | --- | --- |
| `accountant_payment_report_pdf` | Accountant card / receipt button `Отчёт` | `src/screens/accountant/accountant.paymentPdf.boundary.ts` resolves `paymentId`; `src/lib/api/paymentPdf.service.ts` prepares `pdf_payment_source_v1` | `src/lib/api/pdf_payment.ts` renders `payment-order-v1` HTML to PDF | `src/screens/accountant/accountant.paymentPdf.boundary.ts` -> `prepareAndPreviewPdfDocument` | No durable manifest. Repeat click called payment source preparation and local render again. | RPC source preparation + HTML/PDF render sat in the click path. |
| `accountant_proposal_pdf` | Accountant card bottom `PDF` button | `src/screens/accountant/useAccountantDocuments.ts` -> shared `generateProposalPdfDocument` / `exportProposalPdf` | Shared proposal PDF renderer | `src/screens/accountant/useAccountantDocuments.ts` -> `prepareAndPreviewPdfDocument` | No accountant-owned manifest. | Shared proposal generation path, not accountant-specific enough for the first safe slice. |
| `proposal_pdf` attachment preview | Accountant attachment button | `src/screens/accountant/useAccountantDocuments.ts` -> `getLatestProposalAttachmentPreview` | Remote uploaded PDF owned by attachment storage | `prepareAndPreviewPdfDocument` with attachment descriptor | Remote descriptor handoff. | Not a generated heavy PDF path. |
| `invoice` attachment preview | Accountant invoice document button | `src/screens/accountant/useAccountantDocuments.ts` -> `getLatestProposalAttachmentPreview` | Remote uploaded PDF owned by attachment storage | `prepareAndPreviewPdfDocument` with attachment descriptor | Remote descriptor handoff. | Not a generated heavy PDF path. |
| office reports dashboard export | `/office/reports` / report dashboard export | `src/features/reports/ReportsDashboardScreen.tsx` loads dashboard data through report RPCs | `renderReportsExportPdfHtml` + generated PDF descriptor | Reports dashboard route | No accountant screen ownership. | Separate reports module, outside accountant screen exact scope. |

## Selected top-1 slice

Selected path: `accountant_payment_report_pdf`.

Reason:

- It is the accountant `Отчёт` action and a generated PDF/report document.
- It already has a dedicated accountant boundary, so the improvement can stay narrow.
- It uses canonical server source `pdf_payment_source_v1` and payment-order template without changing formulas, grouping, ordering, or template semantics.
- It was the only accountant generated report path that clearly rebuilt source/render work on repeat click before this wave.

## Out of scope for this wave

- Shared proposal PDF architecture.
- Uploaded attachment previews.
- Global reports dashboard rewrite.
- Viewer changes.
- Formula/template changes.
