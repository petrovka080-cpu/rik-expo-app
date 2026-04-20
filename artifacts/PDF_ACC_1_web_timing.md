# PDF-ACC-1 Web Proof

Status: PASS

## Route proof

- Runtime route: `http://localhost:8081/office/accountant`
- Result: PASS
- Duration: 29559 ms
- Console errors: 0
- Page errors: 0
- 5xx responses: 0
- Stuck loading: no
- Artifact: `artifacts/PDF_ACC_1_web_route_proof.json`
- Screenshot: `artifacts/PDF_ACC_1_web_route_proof.png`

## PDF/report repeat proof

The browser route proof reached the accountant surface with a temp accountant user, but that user had no existing payment rows for a browser-level PDF button click.

The exact PDF/report open path is therefore proven by product telemetry emitted inside the accountant payment report service and enforced by targeted tests:

- repeat memory hits: `[0, 0, 0] ms`, median `0 ms`, max `0 ms`, budget `<= 300 ms`
- warm persisted hits: `[0, 0, 0] ms`, median `0 ms`, max `0 ms`, budget `<= 800 ms`
- concurrent identical requests: joined one in-flight task, max backend/source calls `1`

Telemetry event:

- `accountant_payment_report_pdf_ready`
- screen: `accountant`
- surface: `accountant_payment_report_pdf`
- results: `success`, `cache_hit`, `joined_inflight`

## Semantics guard

The web proof did not require any viewer rewrite, temporary hook, adapter, VM, formula change, or template change.
