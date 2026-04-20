# PDF-ACC-FINAL Exec Summary

Verdict: GREEN

## What Changed

- Added accountant-owned manifest/version/reuse for the proposal `PDF` button.
- Added accountant-owned manifest/version/reuse for accountant attachment PDF previews (`proposal_pdf`, `invoice`, `payment` groups).
- Kept existing accountant payment report manifest/reuse path from `PDF-ACC-1` and covered it in final targeted gates.
- Cut accountant click paths over to manifest/readiness services without changing formulas, totals, grouping, ordering, templates, viewer behavior, or UI semantics.
- Added boundary guards so the accountant screen does not drift back to direct heavy PDF generation/lookup.

## Production-Safe Controls

- `source_version` deterministic for proposal, attachment PDF, and payment report paths.
- `artifact_version` deterministic from source version + template/render contract versions.
- `inFlight` is registered before storage/source awaits.
- Repeat click path uses memory cache.
- Warm open path uses persisted manifest descriptor cache.
- Unusable persisted local artifacts are removed and rebuilt through the canonical source path.
- Non-PDF attachments remain file opens and do not write PDF manifests.

## Proof

- Targeted accountant PDF tests: PASS, 7 suites / 32 tests.
- Typecheck: PASS.
- Lint: PASS.
- Full Jest: PASS, 369 suites passed, 1 skipped; 2344 tests passed, 1 skipped.
- Web runtime: PASS, `/office/accountant` card and buttons reachable with no page errors or 5xx.
- Android runtime: PASS. The proof opens `/office/accountant`, verifies the seeded proposal through `accountant_inbox_scope_v1`, renders the fixture row, opens the payment entrypoint, and records no fatal/ANR lines.

## Artifacts

- `artifacts/PDF_ACC_FINAL_0_button_inventory.md`
- `artifacts/PDF_ACC_FINAL_0_latency_map.md`
- `artifacts/PDF_ACC_FINAL_1_priority_map.json`
- `artifacts/PDF_ACC_FINAL_web_timing.md`
- `artifacts/PDF_ACC_FINAL_android_timing.md`
- `artifacts/PDF_ACC_FINAL_timing_samples.json`
- `artifacts/PDF_ACC_FINAL_test_matrix.json`
- `artifacts/PDF_ACC_FINAL_exec_summary.md`
- `artifacts/PDF_ACC_FINAL_web_runtime.json`
- `artifacts/accountant-payment-runtime-proof.json`

## Unchanged

- Accountant PDF/report formulas.
- Totals, grouping, ordering, report semantics.
- Template semantics.
- Global viewer behavior.
- Neighboring roles and document families.
