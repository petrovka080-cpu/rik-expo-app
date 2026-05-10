# S_NIGHT_DATA_02_BUYER_TS_UNBOUNDED_SELECTS_REAL_FIX_BATCH_A

final_status: GREEN_BUYER_TS_UNBOUNDED_SELECTS_REAL_FIX_BATCH_A
target: src/lib/api/buyer.ts

## Before/After Metrics

- global unresolved unbounded selects: 0 -> 0
- global select("*") count: 36 -> 33
- buyer.ts select calls: 7 -> 7
- buyer.ts select("*") count: 3 -> 0
- buyer.ts unresolved unbounded selects: 0 -> 0
- buyer targeted literal shapes remaining: 0

## Fix Proof

- wildcard selects replaced with explicit column constants
- request/proposal status maps keep paged read-through and add bounded input-id ceiling
- request_items compatibility fallback remains ordered, paged, and fail-closed
- no PDF/export flow touched

## Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full tests: PASS
- architecture scanner: PASS
- git diff check: PASS
- artifact JSON parse: PASS
- post-push release verify: pending

## Negative Confirmations

- production touched: NO
- DB writes: NO
- migrations: NO
- Supabase project changes: NO
- spend cap changes: NO
- Realtime 50K/60K load: NO
- destructive/unbounded DML: NO
- OTA/EAS/TestFlight/native builds: NO
- broad cache enablement: NO
- broad rate-limit enablement: NO
- PDF/export flows changed: NO
- pagination changed: NO
- secrets printed: NO

## Supabase Realtime

WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
