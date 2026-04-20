# PDF-ACC-1 Exec Summary

Verdict: GREEN

## What changed

- Added an accountant-owned payment report PDF manifest contract.
- Added deterministic `sourceVersion` from `PaymentOrderPdfContract` business data only.
- Added deterministic `artifactVersion` from source/template/render contract versions.
- Added memory + persisted ready-manifest descriptor reuse for the accountant `Отчёт` / payment order path.
- Added in-flight coalescing keyed by payment report scope and registered before any storage/source await.
- Added product telemetry event `accountant_payment_report_pdf_ready` for rebuild, cache hit, and joined in-flight paths.
- Switched `accountant.paymentPdf.boundary.ts` from the shared generator to the accountant-owned reuse service.

## What stayed unchanged

- Payment order formulas: unchanged.
- Totals/grouping/ordering: unchanged.
- `payment-order-v1` template semantics: unchanged.
- Viewer behavior: unchanged.
- Other roles and PDF families: unchanged.
- Global reports dashboard: unchanged.

## Gates

- Targeted Jest: PASS, 15 tests.
- TypeScript: PASS.
- Expo lint: PASS.
- Full Jest: PASS, 2324 passed, 1 skipped.
- `git diff --check`: PASS.
- Web proof: PASS on `/office/accountant`, no page errors, console errors, 5xx, or stuck loading.
- Android proof: PASS evidence in `artifacts/accountant-payment-runtime-proof.json`; outer command timed out during teardown, repo-context node/adb tails were stopped manually.

## Timing

- Repeat telemetry samples: `[0, 0, 0] ms`, max `0 ms`, budget `<= 300 ms`.
- Warm persisted telemetry samples: `[0, 0, 0] ms`, max `0 ms`, budget `<= 800 ms`.
- Concurrent identical requests: one source/render task, second caller joins in-flight.

## Residual note

The web temp accountant user reached the accountant screen but had no seeded payment rows for a browser-level PDF click. The exact accountant PDF/report repeat behavior is enforced by service-level product telemetry tests and Android reached the seeded payment entrypoint with no fatal lines.
