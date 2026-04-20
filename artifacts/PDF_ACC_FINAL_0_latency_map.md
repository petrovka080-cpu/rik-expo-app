# PDF-ACC-FINAL.0 Latency Map

Status: COMPLETE
Timing source: app telemetry emitted through `recordPlatformObservability` in exact service tests, plus web runtime route proof.

## Proposal PDF

- Button: card bottom `PDF`
- Service: `src/screens/accountant/accountantProposalPdf.service.ts`
- Source preparation: `buildProposalPdfHtml`
- Render/materialization: `renderPdfHtmlToSource` and `buildGeneratedPdfDescriptor`
- Bottleneck before wave: source + render path was invoked as the normal click behavior.
- New repeat path: memory cache hit, no HTML rebuild, no render.
- New warm path: persisted manifest descriptor hit, no source preparation.
- Test proof: `accountantProposalPdf.service.test.ts`
  - repeat memory hit: 3 samples, max <= 300 ms
  - warm storage hit: 3 samples, max <= 800 ms
  - concurrent identical requests: one source/render path

## Attachment PDF Preview

- Buttons: `proposal_pdf`, `invoice`, `payment` PDF preview paths
- Service: `src/screens/accountant/accountantAttachmentPdf.service.ts`
- Source preparation: `getLatestProposalAttachmentPreview`
- Render/materialization: descriptor from canonical attachment URL
- Bottleneck before wave: latest attachment lookup and signed URL handoff repeated on click.
- New repeat path: memory cache hit, no attachment lookup.
- New warm path: persisted manifest descriptor hit, no attachment lookup.
- Test proof: `accountantAttachmentPdf.service.test.ts`
  - repeat memory hit: 3 samples, max <= 300 ms
  - warm storage hit: 3 samples, max <= 800 ms
  - concurrent identical requests: one attachment lookup

## Payment Report

- Button: `Otchet`
- Service: `src/screens/accountant/accountantPaymentReportPdf.service.ts`
- Source preparation: `preparePaymentOrderPdf`
- Render/materialization: `exportPaymentOrderPdfContract`
- Bottleneck closed in previous accountant PDF wave and kept in this final coverage.
- Test proof: `accountantPaymentReportPdf.service.test.ts`
  - repeat memory hit: 3 samples, max <= 300 ms
  - warm storage hit: 3 samples, max <= 800 ms
  - concurrent identical requests: one report preparation path

## Web Runtime

- Route: `/office/accountant`
- Proof artifact: `artifacts/PDF_ACC_FINAL_web_runtime.json`
- Result: PASS
- Checks: screen opened, card opened, PDF/Excel/invoice-or-report buttons reachable, no console errors, no page errors, no 5xx.

## Android Runtime

- Proof artifact: `artifacts/accountant-payment-runtime-proof.json`
- Result: ANDROID BLOCKED
- Reason: emulator was detected and dev-client started, but route did not settle inside the 15 minute cap. No extra recovery loop was attempted.
