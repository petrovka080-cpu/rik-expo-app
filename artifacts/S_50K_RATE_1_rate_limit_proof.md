# S-50K-RATE-1 Rate Limiting And Abuse Guard Proof

Status: GREEN_SCAFFOLD

Live rate limiting enabled: NO
Users blocked: NO
Production traffic migrated: NO
Server deployed: NO
Rate-limit storage created: NO
Existing Supabase client flows replaced: NO
50K readiness claimed: NO
Rate limiting / abuse guard scaffold: READY_DISABLED_BY_DEFAULT

## Files Changed

- `src/shared/scale/rateLimits.ts`
- `src/shared/scale/abuseGuards.ts`
- `tests/scale/rateLimitContracts.test.ts`
- `tests/perf/performance-budget.test.ts`
- `docs/architecture/50k_rate_limiting_abuse_guards.md`
- `artifacts/S_50K_RATE_1_rate_limit_matrix.json`
- `artifacts/S_50K_RATE_1_rate_limit_proof.md`

## Previous 50K Artifacts Inspected

- `artifacts/S_50K_ARCH_1_bff_boundary_matrix.json`
- `artifacts/S_50K_CACHE_1_read_model_matrix.json`
- `artifacts/S_50K_JOBS_1_background_jobs_matrix.json`
- `artifacts/S_50K_JOBS_1_background_jobs_proof.md`
- `artifacts/S_50K_IDEMPOTENCY_1_contracts_matrix.json`
- `docs/architecture/50k_server_api_boundary.md`
- `docs/architecture/50k_idempotency_retry_dead_letter.md`

Previous artifacts were read only. No previous wave artifact was edited.

## Contract Scaffold

Contract paths:

- `src/shared/scale/rateLimits.ts`
- `src/shared/scale/abuseGuards.ts`

The scaffold is pure and disabled-by-default:

- no production network calls
- no storage writes
- no Supabase calls
- no server deployment
- no live enforcement
- no user blocking
- no server admin credential handling in client code
- no raw payload logging
- no PII in generated descriptions

## Operations Mapped

The operation matrix covers 15 future rate-limited operations:

1. `request.list`
2. `proposal.list`
3. `marketplace.search`
4. `catalog.search`
5. `proposal.submit`
6. `warehouse.receive.apply`
7. `accountant.payment.apply`
8. `accountant.invoice.update`
9. `director.approval.apply`
10. `request.item.update`
11. `pdf.report.generate`
12. `notification.fanout`
13. `cache.readModel.refresh`
14. `realtime.channel.setup`
15. `offline.replay.bridge`

Every mapped operation has a disabled-scaffold policy and safe key contract.

## Rate Policy Table

| Bucket | Window | Max requests | Burst | Enforcement |
| --- | ---: | ---: | ---: | --- |
| `read_light` | 60s | 120 | 30 | `disabled_scaffold` |
| `read_heavy` | 60s | 60 | 15 | `disabled_scaffold` |
| `write_sensitive` | 60s | 20 | 5 | `disabled_scaffold` |
| `expensive_job` | 300s | 10 | 2 | `disabled_scaffold` |
| `external_side_effect` | 300s | 5 | 1 | `disabled_scaffold` |
| `realtime` | 60s | 30 | 5 | `disabled_scaffold` |
| `auth_sensitive` | 300s | 10 | 3 | `disabled_scaffold` |
| `global_safety` | 60s | 1000 | 200 | `disabled_scaffold` |

Expensive job policy is stricter than read-heavy policy. External side-effect policy is stricter than write-sensitive policy.

## Abuse Guard Rules

Abuse signals are contract-only:

- `too_many_requests`
- `burst_spike`
- `expensive_job_spike`
- `realtime_reconnect_storm`
- `offline_replay_storm`
- `external_side_effect_replay`
- `invalid_payload_repeated`
- `unknown`

The helper returns observe-only decisions. It does not block users and does not expose raw internals for unknown signals.

## Rate Limit Key Rules

Future keys must use opaque subject keys only. The contract rejects:

- raw payload objects
- JSON-like payload strings
- token-like strings
- JWT-like strings
- signed URLs
- email-like strings
- phone-like strings
- address-like strings
- raw user/company/request/proposal/invoice/payment identifier hints

## Tests Added

`tests/scale/rateLimitContracts.test.ts` covers:

- policy validation for every mapped operation
- live enforcement disabled
- positive bounded window math
- stricter expensive/external policies
- realtime reconnect/setup policy
- safe key validation and unsafe key rejection
- observe-only abuse guard decisions
- no active app flow imports for enforcement
- docs contain disabled-by-default claims

`tests/perf/performance-budget.test.ts` was updated to include the two S-50K-RATE-1 contract-only scale files in the existing bounded scaffold budget.

## Commands Run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `git diff --name-only`
- `git diff --stat`
- `npm run release:verify -- --json`
- `rg` discovery for BFF/cache/jobs/idempotency/rate candidates
- `npm test -- --runInBand rateLimitContracts`
- `npm test -- --runInBand scale`
- `npm test -- --runInBand bffBoundary`
- `npm test -- --runInBand backgroundJobs`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npm test`

Gate results before commit:

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- targeted tests: PASS
- `npm test -- --runInBand`: PASS, 483 suites passed, 3040 tests passed, 1 existing skipped test
- `npm test`: PASS, 483 suites passed, 3040 tests passed, 1 existing skipped test
- `npm run release:verify -- --json`: PASS during clean precheck; while intended files were unstaged it correctly blocked on dirty worktree after passing its internal gates; final post-commit result is recorded in the final report

## Safety Confirmations

- Production touched: NO
- Production writes: NO
- Live rate limiting enabled: NO
- Users blocked: NO
- Server deployed: NO
- Rate-limit infrastructure deployed: NO
- Rate-limit storage created: NO
- Production traffic migrated: NO
- Existing Supabase client flows replaced: NO
- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package changed: NO
- Native config changed: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO

## 10K Impact

This wave does not change runtime behavior. It improves 10K readiness planning by giving future server/BFF shadow runs deterministic policy selection and abuse signal contracts before any enforcement exists.

## 50K Impact

This wave defines the rate limiting and abuse guard contract layer required before safe 50K server-side scaling work. It does not claim 50K readiness.

Next architecture wave: `S-50K-SHADOW-1` if staging access exists, otherwise `S-READINESS-10K-PRECHECK`.
