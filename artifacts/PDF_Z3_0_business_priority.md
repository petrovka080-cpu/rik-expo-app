# PDF-Z3.0 Business Priority Ranking

Status: GREEN audit artifact.

Baseline: `4b6c9b6a531a384d14cd6b59ce1358e7a6b40373`

Mode: read-only. Priority below combines measured latency, repeat-open pain, operational frequency, and blast radius.

## Role Top-1 Summary

| Role | Top-1 PDF path | Business criticality | User impact | Technical pain | Priority inside role |
| --- | --- | --- | --- | --- | --- |
| Warehouse | `warehouse_issue_register_pdf` / `issue_register` | High: outbound warehouse movement ledger and audit trail. | Warehouse operators and managers; likely repeated period opens. | Measured `12472 ms`, no manifest/artifact reuse. | P0 inside Warehouse. |
| Foreman | `foreman_request_pdf` / history request | Medium: request document sharing/history. | Foremen and linked subcontract flows. | Already fixed by `PDF.Z4`; repeat/warm within SLA. | P2 residual only. |
| Purchaser / Buyer | `buyer_proposal_pdf` / shared proposal | High: proposal documents are used across purchasing and approval workflows. | Buyer/Purchaser plus Accountant/Director shared proposal consumers. | Client source fanout, fallback source, local render, no manifest. | P1 inside Buyer/Purchaser. |
| Accountant | `accountant_payment_order_pdf` | High: money workflow and payment evidence. | Accountant and finance review users. | Canonical RPC exists; no artifact cache. | P1 inside Accountant, below measured Warehouse latency. |
| Contractor | `contractor_act_pdf` | High: act documents affect work confirmation. | Contractor users and downstream review. | `PDF.Z5` fixed repeat local render; source fallback remains. | P1 residual, but not next latency wave. |

## Global Ranking

| Rank | Slice | Priority | Reason |
| --- | --- | --- | --- |
| 1 | Warehouse `issue_register` | P0 | Highest measured remaining elapsed time: `12472 ms`; same Warehouse path still lacks deterministic manifest/artifact reuse; daily ledger use makes repeat-open pain likely. |
| 2 | Warehouse `issue_materials` | P1 | Measured `12144 ms`; report-scale material totals. Should follow the register slice if Warehouse stays the rollout focus. |
| 3 | Warehouse `object_work` | P1 | Measured `11073 ms`; heavy object/work/material grouping and strong scale risk, but below `issue_register` and `issue_materials` in existing direct probe. |
| 4 | Shared proposal PDF for Buyer/Purchaser and Accountant | P1 | Wide cross-role exposure and client source fanout, but no current artifact shows worse latency than the measured Warehouse paths. Best next after Warehouse report backlog or if business complaints dominate. |
| 5 | Accountant payment order PDF | P1 | Money-critical and should get artifact reuse if telemetry proves repeated opens, but source RPC is already canonical and bounded. |
| 6 | Contractor act source hardening | P2 | Important, but `PDF.Z5` already removes same-version repeat render as the default. Remaining risk is fallback/source authority, not top latency. |
| 7 | Foreman request/history PDF | P2 | `PDF.Z4` already made repeat/warm fast. Do not reopen before higher-impact remaining slices. |

## Priority Verdict

Next implementation should be a narrow Warehouse issue register slice, not a broad Warehouse rewrite and not a repeat of already shipped Z3/Z4/Z5 work.

The business reason is simple: Warehouse issue register combines a measured double-digit-second cold path with operational ledger use and a direct reuse pattern available from shipped `incoming_register`.
