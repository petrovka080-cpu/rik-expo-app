# S_AUDIT_NIGHT_BATTLE_135_UNSAFE_CAST_UI_BATCH_A_GOD_COMPONENTS Proof

## Scope

- Reduced selected unsafe UI casts in large UI/component paths without visual refactor.
- Priority scan covered `BuyerScreen.tsx`, `AccountantScreen.tsx`, `OfficeHubScreen.tsx`, `MarketHomeScreen.tsx`, and `ContractorScreen.tsx`.
- Buyer and Market priority screens had no selected findings in the fresh scan.
- Did not change production traffic, DB state, migrations, remote env, deploy, OTA, Supabase project settings, spend caps, or Realtime capacity.

## Fresh Scan

Preflight:

- `git fetch origin`: PASS
- `git status --short`: clean
- `git status -sb`: `## main...origin/main`
- `HEAD == origin/main`: `a7157c254cf47c192c543373ee3cfde836e42c4b`
- ahead/behind: `0/0`

Selected findings before:

- `src/screens/accountant/AccountantScreen.tsx`: error object cast.
- `src/screens/accountant/AccountantScreen.tsx`: `cardScrollRef as { current: unknown }`.
- `src/screens/accountant/useAccountantKeyboard.ts`: scroll responder cast, native event target cast, numeric `extra` cast.
- `src/screens/contractor/ContractorScreen.tsx`: `showErr(e: any)`.
- `src/screens/contractor/contractor.utils.ts`: `asErrorLike` cast helper and call-site dependency.
- `src/screens/office/OfficeHubScreen.tsx`: `router.push(card.route as Href)`.

Selected findings after:

- `git grep -n -E "as any|unknown as|@ts-ignore|@ts-expect-error|\\(e: any\\)|cardScrollRef as|router\\.push\\(card\\.route as|e as \\{ message|e as \\{ target|as ScrollResponderLike|extra as number|asErrorLike"` over priority/touched files: PASS, 0 findings.

## Changes

- Replaced accountant error extraction with `getAccountantErrorText` in existing helpers using record guards.
- Typed accountant keyboard scrolling with `RefObject<ScrollView | null>` and narrow responder guards.
- Replaced contractor `showErr(e: any)` with `unknown` plus guarded alert message extraction.
- Removed contractor `asErrorLike` cast helper while preserving existing `pickErr` behavior and contractor alert fallback behavior.
- Typed Office workspace routes as `Href | null`, removing the `router.push` cast.
- Added `tests/api/uiUnsafeCastBatchA.contract.test.ts` for target-file cast discipline and typed adapter/error semantics.
- Kept new tests outside `src` and reused existing utility modules to keep the performance source-module budget green.

## Gates

- focused tests: PASS
  - 10 suites passed, 51 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- performance budget: PASS
  - `npm test -- --runInBand tests/perf/performance-budget.test.ts`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 669 suites passed, 1 skipped, 3970 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - serviceBypassFindings: 0
  - serviceBypassFiles: 0
  - transportControlledFindings: 175
  - unclassifiedCurrentFindings: 0
  - production raw loop unapproved findings: 0
- git diff --check: PASS
- release verify post-push: PENDING

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement without versioned safe flag, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, catch {}, @ts-ignore, or as any.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
