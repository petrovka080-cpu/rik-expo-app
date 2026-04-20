# PDF-ACC-1.1 Boundary Freeze

Exact implementation slice: accountant payment report / payment order PDF.

## Owner chain

| Boundary | Owner |
| --- | --- |
| UI action owner | `src/screens/accountant/components/AccountantCardContent.tsx` and `src/screens/accountant/components/ReadOnlyReceipt.tsx` expose the `Отчёт` action. |
| Hook owner | `src/screens/accountant/useAccountantDocuments.ts` calls `openPaymentReportPreview`. |
| Accountant open-path owner | `src/screens/accountant/accountant.paymentPdf.boundary.ts`. |
| Last payment resolver | `src/screens/accountant/accountant.payment.ts`. |
| Source owner | `src/lib/api/paymentPdf.service.ts` / RPC `pdf_payment_source_v1`. |
| Contract/template owner | `PaymentOrderPdfContract` with template `payment-order-v1`. |
| Render owner | `src/lib/api/pdf_payment.ts` + `src/lib/pdf/pdf.payment.ts`. |
| Manifest/reuse owner added by PDF-ACC-1 | `src/screens/accountant/accountantPaymentReportPdf.shared.ts` and `src/screens/accountant/accountantPaymentReportPdf.service.ts`. |
| Viewer handoff owner | Existing `prepareAndPreviewPdfDocument`; consumer only. |

## Frozen behavior

Must remain unchanged:

- payment order formulas
- payment totals
- bill grouping
- item ordering
- attachment semantics
- `payment-order-v1` template semantics
- accountant card navigation flow
- global viewer behavior

## Freshness policy

The accountant payment report manifest is durable and authoritative for the selected `paymentId` within a 30 minute readiness window. The source remains canonical: when the manifest entry is missing, expired, failed, or points to an unusable artifact, the service rebuilds through `preparePaymentOrderPdf` and `exportPaymentOrderPdfContract`.

This keeps repeat/warm click path fast without treating stale or missing artifacts as fresh.
