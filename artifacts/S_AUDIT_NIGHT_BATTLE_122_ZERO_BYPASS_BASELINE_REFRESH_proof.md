# S_AUDIT_NIGHT_BATTLE_122_ZERO_BYPASS_BASELINE_REFRESH Proof

## Scope

Audit-only baseline refresh after waves 120 and 121.

Selected files:

- `artifacts/S_AUDIT_NIGHT_BATTLE_122_ZERO_BYPASS_BASELINE_REFRESH_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_122_ZERO_BYPASS_BASELINE_REFRESH_proof.md`

No production code was changed because the fresh scanner was already green.

## Baseline Matrix

| Step | Source | Service bypass | Service files | Transport-controlled | Unclassified |
| --- | --- | ---: | ---: | ---: | ---: |
| Old audit baseline before wave 120 | `S_AUDIT_NIGHT_BATTLE_120_REQUESTS_ITEM_MUTATION_TRANSPORT_BOUNDARY_matrix.json` | 3 | 2 | 170 | 0 |
| After wave 120 | `S_AUDIT_NIGHT_BATTLE_120_REQUESTS_ITEM_MUTATION_TRANSPORT_BOUNDARY_matrix.json` | 1 | 1 | 172 | 0 |
| After wave 121 | `S_AUDIT_NIGHT_BATTLE_121_AUTH_LIFECYCLE_TRANSPORT_BOUNDARY_matrix.json` | 0 | 0 | 173 | 0 |
| Current fresh scanner | `npx tsx scripts/architecture_anti_regression_suite.ts --json` | 0 | 0 | 173 | 0 |

## Fresh Scanner

Command:

```powershell
npx tsx scripts/architecture_anti_regression_suite.ts --json
```

Result:

```text
serviceBypassFindings: 0
serviceBypassFiles: 0
transportControlledFindings: 173
unclassifiedCurrentFindings: 0
direct_supabase_service_bypass_budget: PASS
direct_supabase_exception_registry: PASS
```

The scanner safety block reported:

```text
productionCalls: false
dbWrites: false
migrations: false
supabaseProjectChanges: false
envChanges: false
secretsPrinted: false
```

## Direct Supabase Grep

Command:

```powershell
git grep -n 'supabase\.\(from\|rpc\|auth\|storage\|channel\|realtime\)' src
```

Summary:

```text
total grep matches: 204
non-transport service matches after filter: 0
allowed .transport/.bff.client/.test/root matches: 204
root client matches: 4
```

Non-transport service filter:

```powershell
git grep -n 'supabase\.\(from\|rpc\|auth\|storage\|channel\|realtime\)' src |
  rg -v '(\.transport\.|\.bff\.client\.|\.test\.|src/lib/supabaseClient\.ts)'
```

Filtered result was empty.

## Root Client Confirmation

`src/lib/supabaseClient.ts` remains the irreducible root Supabase client, not a service bypass.

Evidence:

- Fresh grep found four root-client matches in `src/lib/supabaseClient.ts`.
- `scripts/architecture_anti_regression_suite.ts` explicitly classifies paths ending with `/supabaseClient.ts` as `transport_controlled`.
- `serviceBypassFindings` is `0`, so the root client is contained by scanner policy.

Root-client grep locations:

```text
src/lib/supabaseClient.ts:480
src/lib/supabaseClient.ts:484
src/lib/supabaseClient.ts:516
src/lib/supabaseClient.ts:535
```

## Gate Status

At artifact creation time:

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: to run after push

Full Jest summary:

```text
Test Suites: 1 skipped, 656 passed, 656 of 657 total
Tests:       1 skipped, 3898 passed, 3899 total
```

Post-push release verification is intentionally performed after the commit is pushed; the final wave report records its result.

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, new empty catch blocks, new `@ts-ignore`, or new `as any`.

Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`.
