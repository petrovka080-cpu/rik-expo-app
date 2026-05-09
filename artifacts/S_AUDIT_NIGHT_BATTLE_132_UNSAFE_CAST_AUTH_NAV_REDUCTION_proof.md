# S_AUDIT_NIGHT_BATTLE_132_UNSAFE_CAST_AUTH_NAV_REDUCTION Proof

## Scope

- Selected auth/session/navigation lifecycle unsafe-cast bucket from wave 130.
- Edited only route/lifecycle shell typing and focused tests.
- Did not change production business semantics, provider behavior, Supabase settings, migrations, deploy, OTA, or DB state.

## Fresh Scan

Preflight:

- `git fetch origin`: PASS
- `git status --short`: clean
- `git status -sb`: `## main...origin/main`
- `HEAD == origin/main`: `31481dd3fe027deb6b5bb5c0d63ca26c8751f63c`
- ahead/behind: `0/0`

Selected findings before:

- `src/screens/profile/ProfileContent.tsx`: `router.push as unknown as (href: string) => void`
- `app/_layout.tsx`: `originalWarn.apply(console, args as unknown as [])`
- `src/lib/navigation/safeBack.test.ts`: three navigation fallback routes using `as any`

Selected findings after:

- `git grep -n -E "as any|unknown as|@ts-ignore|@ts-expect-error" -- app/_layout.tsx src/screens/profile/ProfileContent.tsx src/lib/navigation/safeBack.test.ts`: PASS, 0 findings

Broader auth/navigation scan after:

- Remaining findings: 9
- Classification: API/transport or test/mock provider casts outside the selected auth/navigation lifecycle production bucket.

## Changes

- `src/screens/profile/ProfileContent.tsx`: removed `unknown as` router push adapter and used existing `Href`-backed route constants directly.
- `app/_layout.tsx`: replaced console warn tuple cast with `unknown[]` rest args and direct forwarding.
- `src/lib/navigation/safeBack.test.ts`: replaced `as any` route fixtures with a local `Href`-satisfying route constant.
- `src/screens/profile/ProfileContent.composition.test.tsx`: added focused assertions for active context route opening in both office and market states.

## Gates

- focused tests: PASS
  - `npm test -- --runInBand tests/api/authLifecycleTransport.contract.test.ts tests/navigation/auth-listener-lifecycle.test.tsx src/lib/entry/rootLayout.recovery.test.tsx tests/strict-null/authLifecycle.phase1.test.ts src/screens/profile/ProfileContent.composition.test.tsx src/lib/navigation/safeBack.test.ts`
  - 6 suites passed, 40 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 667 suites passed, 1 skipped, 3955 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - serviceBypassFindings: 0
  - serviceBypassFiles: 0
  - transportControlledFindings: 175
  - unclassifiedCurrentFindings: 0
  - production raw loop unapproved findings: 0
- git diff --check: PASS
- release verify post-push: PASS
  - `npm run release:verify -- --json`
  - verified head: `8f3b039dd23941dcb03fe459b74570a220264a20`
  - origin/main: `8f3b039dd23941dcb03fe459b74570a220264a20`
  - sync status: synced
  - release verify gates: tsc PASS, expo lint PASS, architecture anti-regression PASS, Jest runInBand PASS, Jest PASS, git diff --check PASS
  - readiness status: pass
  - OTA disposition: allow
  - OTA published: false
  - EAS update triggered: false

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement without versioned safe flag, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, catch {}, @ts-ignore, or as any.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
