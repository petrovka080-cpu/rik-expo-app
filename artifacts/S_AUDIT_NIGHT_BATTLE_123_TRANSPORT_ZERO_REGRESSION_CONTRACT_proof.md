# S_AUDIT_NIGHT_BATTLE_123_TRANSPORT_ZERO_REGRESSION_CONTRACT

## Scope

- Selected `scripts/architecture_anti_regression_suite.ts` because it is the existing scanner that classifies direct Supabase provider calls.
- Selected `tests/architecture/architectureAntiRegressionSuite.test.ts` because it is the existing architecture contract around direct Supabase bypass behavior.
- No production code, migrations, DB writes, remote env changes, deploy, OTA, or Supabase project settings were touched.

## Before

- Git start state: clean worktree, `HEAD == origin/main`, ahead/behind `0/0`.
- Fresh scanner before contract hardening:
  - `serviceBypassBudget`: `157`
  - `serviceBypassFindings`: `0`
  - `serviceBypassFiles`: `0`
  - `transportControlledFindings`: `173`
  - `testOnlyFindings`: `47`
  - `unclassifiedCurrentFindings`: `0`
- Fresh grep command was run:
  - `git grep -n "supabase\\.\\(from\\|rpc\\|auth\\|storage\\|channel\\|realtime\\)" src`

## Contract Change

- Service bypass budget is now `0`.
- Any service bypass finding fails the scanner even if a caller passes a higher budget override.
- The scanner now records:
  - `transportOwner`
  - `expectedTransportOwner`
  - `matchedCall`
- Readable failure messages include:
  - `file`
  - `line`
  - `matched_call`
  - `expected_transport_owner`
- The direct provider matcher now includes `supabase.realtime.*`.
- `src/lib/supabaseClient.ts` is classified as `transport_controlled` with `transportOwner: root_client`, not as bypass.
- New `*.transport.*` files remain `transport_controlled` and do not count as bypass.

## After

- Fresh scanner after contract hardening:
  - `serviceBypassBudget`: `0`
  - `totalFindings`: `222`
  - `serviceBypassFindings`: `0`
  - `serviceBypassFiles`: `0`
  - `transportControlledFindings`: `175`
  - `testOnlyFindings`: `47`
  - `unclassifiedCurrentFindings`: `0`

## Focused Verification

- `npm test -- tests/architecture/architectureAntiRegressionSuite.test.ts --runInBand`: PASS
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS

## Mandatory Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: PENDING

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement without versioned safe flag, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, `catch {}`, `@ts-ignore`, or `as any` were added.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
