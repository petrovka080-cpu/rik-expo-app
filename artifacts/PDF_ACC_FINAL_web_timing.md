# PDF-ACC-FINAL Web Timing

Status: PASS

## Runtime Reachability

- Route: `/office/accountant`
- Artifact: `artifacts/PDF_ACC_FINAL_web_runtime.json`
- Screenshot: `artifacts/PDF_ACC_FINAL_web_runtime.png`
- Result: PASS

Checks passed:

- accountant screen opened
- accountant card opened
- `PDF` button reachable
- `Excel` button reachable
- invoice/report button reachable
- no blocking console errors
- no page errors
- no 5xx responses
- no stuck loading state in the checked card body

## Timing Truth

Primary timing source is app telemetry in exact tests:

- `accountant_proposal_pdf_ready`
- `accountant_attachment_pdf_ready`
- `accountant_payment_report_pdf_ready`

Budgets:

- repeat/memory hit <= 300 ms
- warm/storage hit <= 800 ms

All exact telemetry tests passed.
