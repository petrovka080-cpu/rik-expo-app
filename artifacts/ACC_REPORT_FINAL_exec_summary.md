# ACC_REPORT_FINAL Execution Summary

## Exact Path

- Top-1 hardened path: accountant payment report / `payment_order` PDF action from the accountant paid-documents flow.
- Exact owner chain: `preparePaymentOrderPdf` source contract -> accountant payment report manifest/readiness -> artifact materialization/reuse -> accountant click/open path -> viewer handoff.

## What Changed

- Added durable accountant readiness/artifact handling in [src/screens/accountant/accountantPaymentReportPdf.service.ts](c:/dev/rik-expo-app/src/screens/accountant/accountantPaymentReportPdf.service.ts) with explicit `ready | building | stale | failed | missing` transitions.
- Kept deterministic `source_version` / `artifact_version` boundaries from the shared manifest contract and preserved all business/PDF semantics.
- Removed heavy rebuild from the normal repeat path by allowing same-version reuse from persisted artifact state and from a persisted `PaymentOrderPdfContract` snapshot when the web descriptor itself is a blob URL.
- Preserved in-flight coalescing so identical concurrent accountant PDF requests still collapse into one backend/materialization path.
- Hardened exact-scope web and Android verifiers without touching accountant business logic.

## Proof

- Targeted accountant shared/service Jest suites: PASS.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- `npx jest --runInBand --no-coverage`: PASS.
- `git diff --check`: PASS.
- Web runtime proof: PASS.
  Repeat median `30 ms`, max `32 ms`.
  Warm median `124 ms`, max `125 ms`.
  Artifact hit median `28 ms`, max `29 ms`.
- Android runtime proof: BLOCKED after one recovery attempt.
  First attempt surfaced verifier-side FIO drift (`acc report final` vs typed Android value), not a PDF-path crash.
  Recovery attempt switched to a machine-safe FIO token and exact-check logic, but the modal value still did not stabilize under adb input, so Android report-path proof could not be completed honestly.
  Process stayed alive, there was no fatal/ANR, and the block is recorded in [artifacts/ACC_REPORT_FINAL_android_runtime.json](c:/dev/rik-expo-app/artifacts/ACC_REPORT_FINAL_android_runtime.json).

## Outcome

- Web accountant repeat/warm path now behaves like a production reuse path instead of rebuild-on-repeat.
- Accountant formulas, totals, grouping, ordering, template semantics, and viewer consumer semantics were not changed.
- Release is eligible under the wave rule that allows `Android PASS or honest BLOCKED`.
