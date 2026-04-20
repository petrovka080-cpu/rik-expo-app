# PDF-FINAL.0 Latency / Bottleneck Map

Status: implementation artifact.

Source inputs:

- Existing runtime artifacts from `PDF-Z1` through `PDF-ACC-FINAL`.
- `PDF-Z3.0` remaining-role priority audit.
- Current `PDF-FINAL` exact tests for Warehouse issue-register reuse/concurrency.

## Top Runtime Evidence

| Path | Previous cold / pain evidence | Bottleneck before fix | Current state |
| --- | ---: | --- | --- |
| Director finance management | Report-scale source/render, previously session-local mitigation only | Missing durable manifest/artifact identity | Closed in `PDF-Z1`. |
| Director production report | Repeat/warm needed deterministic reuse | Client in-flight and manifest lookup had prior regression risk | Closed in `PDF-Z2`; repeat median 236 ms, warm median 240 ms. |
| Warehouse incoming register | 13772 ms selected top warehouse path | Cold render/upload on repeat | Closed in `PDF-Z3`; warm median 150 ms, repeat median 137 ms. |
| Foreman history request PDF | Cold first build 13234 ms | Random storage path and repeat rebuild | Closed in `PDF-Z4`; warm median 213 ms, repeat median 207 ms. |
| Contractor act PDF | Repeat local render path | No same-version descriptor reuse | Closed in `PDF-Z5` with exact reuse/concurrency tests. |
| Purchaser proposal PDF | Repeat generator entry from proposal detail | No purchaser-owned freshness contract | Closed in `PDF-PUR-1` with snapshot manifest/reuse tests. |
| Accountant payment report | Money-critical repeat report button | No accountant-owned ready descriptor cache | Closed in `PDF-ACC-1`; repeat/warm telemetry max 0 ms in service proof. |
| Accountant proposal / attachment PDFs | Repeat document/attachment opens | No accountant-owned readiness/reuse layer | Closed in `PDF-ACC-FINAL`. |
| Warehouse issue register | 12472 ms in `PDF-Z3.0` audit | Z3 manifest/reuse branch was limited to `incoming_register`; `issue_register` still rebuilt on normal repeat | Closed by `PDF-FINAL` code slice: client fingerprint, source/artifact versions, artifact hit before render, memory/persisted handoff, in-flight coalescing. |

## Remaining Non-P0 Classes

| Class | Examples | Current policy |
| --- | --- | --- |
| Warehouse report-scale P1 | `issue_materials`, `incoming_materials`, `object_work`, day variants | Backend offload remains; not included in current exact top-offender slice because `issue_register` had the highest remaining measured priority. |
| Backend-offloaded but not fully artifact-cached | Director supplier summary, Director subcontract report | Not current top runtime blocker; keep formulas/templates stable and promote only with telemetry. |
| Single-document on-demand | Warehouse issue/incoming forms, Director request PDF, Foreman single request when not hot | On-demand acceptable; manifest only if repeat telemetry proves pain. |
| Existing artifact opens | Accountant uploaded PDFs | No generation bottleneck; descriptor/readiness reuse only. |

## PDF-FINAL Bottleneck Closed

Warehouse `issue_register` no longer has render/upload as the normal repeat path:

1. Screen data computes `wissue_client_v1_*` from loaded issue rows and period.
2. Click passes that fingerprint into the canonical warehouse backend request.
3. Client service registers `inFlight` before any manifest/cache/backend await.
4. Same source version returns memory or persisted signed artifact handoff.
5. Backend checks deterministic storage artifact before `renderPdfBytes`.

Runtime timing artifacts are recorded separately in:

- `artifacts/PDF_FINAL_web_timing.md`
- `artifacts/PDF_FINAL_android_timing.md`
- `artifacts/PDF_FINAL_timing_samples.json`
