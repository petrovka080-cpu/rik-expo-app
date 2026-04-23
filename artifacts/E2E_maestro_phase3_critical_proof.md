# E2E_MAESTRO_PHASE_3_CRITICAL_FLOWS proof

## Preflight

- Previous wave `ACCESSIBILITY_ROLES_PHASE_1` was already in `main`
- `HEAD == origin/main` at phase start
- worktree was clean at phase start
- previous proof artifacts were already present
- previous release-guard status was already recorded honestly

## Commands run

```bash
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
$env:NODE_ENV='production'; .\gradlew.bat app:assembleRelease
npm run e2e:maestro:infra
npm run e2e:maestro:foundation
npm run e2e:maestro:auth
npm run e2e:maestro:critical
npm test
git diff --check
```

## Gate results

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `.\gradlew.bat app:assembleRelease` with `NODE_ENV=production`: PASS
- `npm run e2e:maestro:infra`: PASS
- `npm run e2e:maestro:foundation`: PASS
- `npm run e2e:maestro:auth`: PASS
- `npm run e2e:maestro:critical`: PASS
- `npm test`: PASS
- `git diff --check`: PASS

## Maestro critical suite result

- `Active Context Switch`: PASS
- `Market Entry`: PASS
- `Office Buyer Route Roundtrip`: PASS
- `Office Safe Entry`: PASS

## Exact product blocker that was closed

The main failing path was a real protected-entry regression in exact scope, not a flaky selector:

- the profile office entry pushed to a stale route contract (`/office/index`)
- the actual tabs route in this app is `/(tabs)/office`

The fix stayed narrow:

- correct `OFFICE_TAB_ROUTE` to the real tabs route
- update only the affected route tests
- add stable selectors on the real tab buttons and protected landing points
- keep all flow waits deterministic and state-based

## Runtime interpretation

- protected office entry from profile is healthy
- protected office -> buyer route roundtrip is healthy
- protected market entry from profile is healthy
- active context switching between office and market is healthy
- no white-screen or broken protected-entry loop was observed on the canonical Android release path

## Seed discipline

- the critical suite creates one temporary buyer user through the existing service-role verifier discipline
- it seeds only the minimum company/company-profile/company-member records needed for buyer/office entry
- cleanup runs after the suite and force-stops the app as best effort
- no login bypass is used: auth still goes through the real UI

## Debug output

- infra debug output: `artifacts/maestro-infra/`
- foundation debug output: `artifacts/maestro-foundation/`
- auth debug output: `artifacts/maestro-auth/`
- critical debug output: `artifacts/maestro-critical/`

## Release-guard tail

Dirty-worktree release-guard probe was run before commit/push only to classify the final engineering diff:

- `npm run release:preflight -- --json`: FAIL on cleanliness only
- `npm run release:verify -- --json`: FAIL on cleanliness only
- `npm run release:ota -- --dry-run --json`: FAIL on cleanliness only

Observed classification from that probe:

- `classification.kind = runtime-ota`
- `changeClass = js-ui`
- `otaDisposition = block`

Observed blockers from the dirty-worktree probe:

- `Worktree is dirty. Release automation requires a clean repository state.`
- `Runtime OTA publish requires an explicit --channel.`
- `Runtime OTA publish requires a non-empty --message.`

That probe was not treated as the final release decision.

The final clean committed release-tail decision is executed after commit/push and reported from the clean state.

## Status

`GREEN`
