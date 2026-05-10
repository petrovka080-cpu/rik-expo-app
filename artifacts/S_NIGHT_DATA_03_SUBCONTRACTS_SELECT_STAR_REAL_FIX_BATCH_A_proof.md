# S_NIGHT_DATA_03_SUBCONTRACTS_SELECT_STAR_REAL_FIX_BATCH_A

final_status: GREEN_SUBCONTRACTS_SELECT_STAR_REAL_FIX_BATCH_A
generated_at: 2026-05-10T16:03:18.042Z

## Selection

Selected file: src/screens/subcontracts/subcontracts.shared.ts

Reason selected: high/fix_now was already 0, so the next production-safe data wave removed the densest remaining runtime select-star cluster without broadening scope. This file had 5 select("*") calls and 1 medium domain-bounded scanner entry.

## Change

- Replaced subcontract row select-star calls with SUBCONTRACT_ROW_SELECT.
- Replaced subcontract item row select-star calls with SUBCONTRACT_ITEM_ROW_SELECT.
- Preserved existing range-based pagination and collect-all ceilings.
- Preserved insert-returning semantics for appendSubcontractItems by returning the same normalized item fields.
- No PDF/export flows changed.

## Metrics

| metric | before | after | delta |
| --- | ---: | ---: | ---: |
| global unresolved unbounded selects | 0 | 0 | 0 |
| global select("*") count | 33 | 28 | -5 |
| subcontracts.shared.ts select("*") count | 5 | 0 | -5 |
| subcontracts.shared.ts medium-risk entries | 1 | 0 | -1 |

## Gates

- focused tests: PASS
- npx tsc --noEmit --pretty false: PASS
- npx expo lint: PASS
- npm test -- --runInBand: PASS
- architecture scanner: PASS, serviceBypassFindings=0
- git diff --check: PASS
- artifact JSON parse: PASS
- post-push release verify: PASS (65e21b3d61f4f9a3a56c3334ef6f7ec70966d4ea)

## Negative Confirmations

- no force push
- no tags
- no secrets printed
- no @ts-ignore
- no as any
- no catch {}
- no broad rewrite
- no Supabase project changes
- no spend cap changes
- no Realtime 50K/60K load
- no destructive/unbounded DML
- no OTA/EAS/TestFlight/native builds
- no production mutation broad enablement
- no broad cache enablement
- no broad rate-limit enablement
- no DB writes
- no migrations

## Supabase Realtime

WAITING_FOR_SUPABASE_SUPPORT_RESPONSE

## Post-Push Release Verify

PASS on 65e21b3d61f4f9a3a56c3334ef6f7ec70966d4ea. headMatchesOriginMain=true, ahead=0, behind=0, readiness=pass, otaPublished=false, easBuildTriggered=false. Final artifact-only commit will receive a repeated release verify before final response.
