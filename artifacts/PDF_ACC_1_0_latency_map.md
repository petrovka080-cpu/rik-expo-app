# PDF-ACC-1.0 Accountant Latency / Bottleneck Map

## Top-1 generated accountant path

Path: `accountant_payment_report_pdf`

Route / screen:

- `/office/accountant`
- `AccountantScreen` opens payment/report actions through `useAccountantDocuments`
- `useAccountantPaymentPdfBoundary` owns the accountant payment report open path

Current pre-wave click path:

1. Resolve `paymentId` from current row or `fetchLastPaymentIdByProposal`.
2. Call shared payment order generator.
3. Prepare canonical payment source through `pdf_payment_source_v1`.
4. Shape `PaymentOrderPdfContract`.
5. Render payment-order HTML/PDF.
6. Hand descriptor to `prepareAndPreviewPdfDocument`.

Pre-wave bottleneck classification:

| Stage | Owner | Risk |
| --- | --- | --- |
| `paymentId` lookup | `src/screens/accountant/accountant.payment.ts` | Extra network hop when current card has only proposal id. |
| Source load | `src/lib/api/paymentPdf.service.ts` | Heavy canonical RPC is in normal click path. |
| Data shaping | `src/lib/api/paymentPdf.service.ts` | Runs again on repeat click before this wave. |
| Render/materialization | `src/lib/api/pdf_payment.ts` and `src/lib/pdf/pdf.payment.ts` | Local HTML/PDF render runs again on repeat click before this wave. |
| Open handoff | `prepareAndPreviewPdfDocument` | Consumer only; no evidence that viewer is the source bottleneck. |

## Target after PDF-ACC-1

| Mode | Expected behavior |
| --- | --- |
| repeat same payment | durable/in-memory manifest descriptor hit, no source RPC, no local render |
| warm same payment | stored ready manifest descriptor hit when file is reusable |
| missing/expired/unusable artifact | controlled rebuild through existing canonical source and template |
| concurrent identical clicks | single in-flight task registered before storage/source awaits |

Timing proof will be recorded in:

- `artifacts/PDF_ACC_1_web_timing.md`
- `artifacts/PDF_ACC_1_android_timing.md`
- `artifacts/PDF_ACC_1_timing_samples.json`
