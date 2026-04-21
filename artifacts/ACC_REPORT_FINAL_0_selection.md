# ACC-REPORT-FINAL.0 Selection

Status: COMPLETE

## Exact Path

- Screen / section: `src/screens/accountant/AccountantScreen.tsx` card body and read-only receipt surfaces.
- Exact button / action: top-card `Отчёт` / payment report open path.
- Click owner: `src/screens/accountant/accountant.paymentPdf.boundary.ts`
- Source owner: `src/lib/api/paymentPdf.service.ts` via `preparePaymentOrderPdf`
- Render / materialization owner: `src/screens/accountant/accountantPaymentReportPdf.service.ts` via `buildGeneratedPdfDescriptor` -> `exportPaymentOrderPdfContract`
- Viewer / handoff owner: `prepareAndPreviewPdfDocument` consumer path from `accountant.paymentPdf.boundary.ts`

## Why This Is Top-1

- This is the only accountant-owned `report` click path in exact scope.
- It is business-critical and high-frequency in paid / partial-paid accountant flows.
- The pre-wave path already had deterministic manifest fields, but the effective production owner still reused by `paymentId` and descriptor cache rather than a durable readiness record with authoritative status transitions.
- That left the heaviest accountant report path without a real scope-level readiness model for `ready | building | stale | failed | missing`.

## Pre-Cutover Bottleneck

- Repeat open no longer rerendered the PDF on every click after `PDF-ACC-1`, but the service still lacked a durable readiness owner and did not preserve/report controlled status transitions.
- Persisted reuse was bound to a `paymentId` cache slot instead of a scope readiness record plus versioned artifact record.
- `last_successful_artifact`, `building`, `stale`, and `failed` were present in the manifest type but not actually driven as a durable lifecycle.

## Current Production Model After This Wave

- Fresh source truth is resolved through `preparePaymentOrderPdf`.
- Exact reuse now flows through `scope(paymentId) -> durable readiness record -> artifactVersion -> descriptor artifact`.
- Same `sourceVersion` reuses the stored artifact without rerendering the PDF.
- Changed `sourceVersion` triggers controlled `stale -> building -> ready` transitions.
- Missing/unusable artifacts trigger controlled `missing -> building -> ready` transitions.
- Render failures persist `failed` while preserving `last_successful_artifact`.

## Narrow-Scope Exclusions

- No proposal PDF button changes.
- No attachment / invoice preview changes.
- No reports dashboard / director reports changes.
- No viewer rewrite.
