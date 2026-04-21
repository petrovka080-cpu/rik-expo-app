# ACC-REPORT-FINAL.1 Boundary Map

Status: COMPLETE

## Owner Chain

- Source owner:
  `src/lib/api/paymentPdf.service.ts`
  Exact responsibilities: canonical payment RPC source load, payment-order shaping, deterministic payment contract generation, `generatedAt` source timestamp exposure.

- Readiness / manifest owner:
  `src/screens/accountant/accountantPaymentReportPdf.service.ts`
  Exact responsibilities: scope readiness lifecycle, durable status transitions, last successful artifact retention, artifact keying, in-flight coalescing.

- Materialization owner:
  `src/screens/accountant/accountantPaymentReportPdf.service.ts`
  `src/lib/api/pdf_payment.ts`
  `src/lib/pdf/pdf.runner.ts`
  Exact responsibilities: only on controlled rebuild, render payment-order HTML to a descriptor through `exportPaymentOrderPdfContract` and `buildGeneratedPdfDescriptor`.

- Click / open owner:
  `src/screens/accountant/accountant.paymentPdf.boundary.ts`
  Exact responsibilities: resolve `paymentId`, request accountant report descriptor, hand off to viewer through `prepareAndPreviewPdfDocument`.

- Reuse owner:
  `src/screens/accountant/accountantPaymentReportPdf.service.ts`
  Exact responsibilities: same-version artifact reuse through `artifactVersion` memory cache and durable artifact storage.

- Freshness / invalidation owner:
  `src/screens/accountant/accountantPaymentReportPdf.service.ts`
  Exact responsibilities: recompute authoritative `sourceVersion` from fresh `preparePaymentOrderPdf`, compare it against durable readiness, then drive `ready | stale | missing | building | failed`.

## Controlled Flow

1. `accountant.paymentPdf.boundary.ts` resolves the exact `paymentId`.
2. `accountantPaymentReportPdf.service.ts` registers `inFlight` before any await.
3. The service loads prior readiness for the scope.
4. The service recomputes authoritative source truth with `preparePaymentOrderPdf`.
5. The service compares current `sourceVersion` against durable readiness.
6. Same version: artifact reuse path, no rerender.
7. New version or missing artifact: controlled readiness transition, then rebuild.
8. Viewer remains a pure consumer of the descriptor.

## Explicit Non-Owners

- `AccountantScreen.tsx` is not the readiness owner.
- UI local state is not the source of truth.
- `prepareAndPreviewPdfDocument` is not responsible for freshness or report reuse policy.
- No neighboring accountant PDF families are owned by this wave.
