# PDF-ACC-FINAL.0 Button Inventory

Status: COMPLETE
Scope: accountant screen only

## Accountant PDF Buttons

| Button / action | Screen / section | Document kind | Source owner | Render / materialization owner | Open-path owner | Previous behavior | Current behavior | Bottleneck closed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PDF | `AccountantScreen` card bottom bar | `accountant_proposal_pdf` | `buildProposalPdfHtml` via `accountantProposalPdf.service.ts` | `renderPdfHtmlToSource` / `buildGeneratedPdfDescriptor` | `useAccountantDocuments.onOpenProposalPdf` -> `prepareAndPreviewPdfDocument` | Rebuilt proposal PDF source on every click through `generateProposalPdfDocument` | Manifest/version/reuse service with memory + durable descriptor cache | Rebuild-every-click removed; repeat is memory hit, warm is storage hit |
| Source document | card attachment action, group `proposal_pdf` | `accountant_attachment_pdf` | `getLatestProposalAttachmentPreview` via `accountantAttachmentPdf.service.ts` | Source PDF descriptor from canonical attachment URL | `useAccountantDocuments.previewAttachment` and legacy `accountant.docs.ts` | Re-ran latest attachment lookup and signed URL handoff each click | Manifest/version/reuse service for PDF attachment previews | Repeat lookup/sign churn removed for PDF attachments |
| Invoice / "Schet" | card top action, group `invoice` | `accountant_attachment_pdf` | `getLatestProposalAttachmentPreview` via `accountantAttachmentPdf.service.ts` | Source PDF descriptor from canonical attachment URL | `useAccountantDocuments.previewAttachment` and legacy `accountant.docs.ts` | Re-ran latest attachment lookup and signed URL handoff each click | Manifest/version/reuse service for PDF attachment previews | Repeat lookup/sign churn removed for invoice PDFs |
| Payment document | legacy upload/open path, group `payment` | `accountant_attachment_pdf` when PDF exists | `getLatestProposalAttachmentPreview` via `accountantAttachmentPdf.service.ts` | Source PDF descriptor from canonical attachment URL | `accountant.docs.openPaymentDocsOrUpload` | Re-ran latest attachment lookup before preview | Shared attachment manifest/reuse path | Duplicate attachment lookup removed for repeat PDF previews |

## Accountant Report Buttons

| Button / action | Screen / section | Report kind | Source owner | Render / materialization owner | Open-path owner | Current behavior | Bottleneck closed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Report / "Otchet" | card top action and read-only receipt | `accountant_payment_report` | `preparePaymentOrderPdf` via `accountantPaymentReportPdf.service.ts` | `exportPaymentOrderPdfContract` / `buildGeneratedPdfDescriptor` | `accountant.paymentPdf.boundary.ts` | Manifest/version/reuse service from `PDF-ACC-1`; repeat and warm telemetry covered | Heavy payment report generation is not the normal repeat path |

## Out Of Scope / Non-Generators

| Button / action | Decision |
| --- | --- |
| Header Excel | Stub alert today; no report/PDF generation path exists to optimize in this wave |
| Card Excel | Stub alert today; no report/PDF generation path exists to optimize in this wave |
| Generic attachment chips | File-open consumer path; exact canonical PDF buttons above are now manifest-driven |

## Top Heavy Offenders

1. `PDF` proposal generation: prior path rebuilt HTML/render source on repeat click.
2. `Schet` / attachment PDF preview: prior path repeated latest attachment lookup and signed URL handoff.
3. `Otchet` payment report: already converted in `PDF-ACC-1`, kept in final coverage and gates.
