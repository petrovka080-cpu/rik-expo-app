# S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF

final_status: BLOCKED_STAGING_LOAD_ABORTED_SAFELY
generated_at: 2026-05-10T14:35:41.399Z

## Scope

- staging only: YES
- readonly/synthetic only: YES
- route expansion: NO
- production touched: NO
- DB writes initiated: NO
- metrics redacted: YES

## Approvals And Environment

- common load approvals present: YES
- phase B 5K approvals present: YES
- staging Supabase env present: YES
- staging BFF base URL present: YES
- production fallback used: NO
- secrets printed: NO

## Ladder Results

| requests | phase | status | attempted | success | errors | error_rate | p50 | p95 | p99 | abort | health_before | ready_before | health_after | ready_after |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 100 | phase_a_ladder | green | 100 | 100 | 0 | 0.0000% | 520 | 1239 | 1299 | NO | 200 | 200 | 200 | 200 |
| 250 | phase_a_ladder | aborted | 250 | 250 | 0 | 0.0000% | 499 | 2499 | 2541 | p95_latency_exceeded | 200 | 200 | 200 | 200 |
| 500 | phase_a_ladder | not_run | 0 | 0 | 0 | 0.0000% | n/a | n/a | n/a | NO | n/a | n/a | n/a | n/a |
| 1000 | phase_a_ladder | not_run | 0 | 0 | 0 | 0.0000% | n/a | n/a | n/a | NO | n/a | n/a | n/a | n/a |
| 2000 | phase_b_5k | not_run | 0 | 0 | 0 | 0.0000% | n/a | n/a | n/a | NO | n/a | n/a | n/a | n/a |
| 5000 | phase_b_5k | not_run | 0 | 0 | 0 | 0.0000% | n/a | n/a | n/a | NO | n/a | n/a | n/a | n/a |

## Negative Confirmations

- no production load: YES
- no Realtime 50K/60K load: YES
- no migrations: YES
- no Supabase project changes: YES
- no spend cap changes: YES
- no cache config changes: YES
- no rate-limit changes: YES
