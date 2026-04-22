## Wave

`FOREMAN_DRAFT_OWNER_SPLIT_FINAL`

## Focused regression proof

Focused foreman boundary suites were run with:

```bash
npx jest tests/foreman/foreman.draftBoundary.decomposition.test.ts tests/foreman/foreman.draftBoundaryFailure.model.test.ts tests/foreman/foreman.draftBoundary.effects.test.ts tests/foreman/foreman.draftBoundary.postSubmit.test.ts tests/foreman/foreman.draftBoundary.requestDetails.test.ts tests/foreman/foreman.draftBoundary.telemetry.test.ts tests/foreman/foreman.draftBoundary.logic.test.ts tests/foreman/foreman.draftBoundary.plan.test.ts tests/foreman/foreman.draftBoundary.recovery.test.ts tests/foreman/foreman.draftStateBoundary.model.test.ts src/screens/foreman/foreman.manualRecovery.model.test.ts src/screens/foreman/foreman.postSubmitDraftPlan.model.test.ts src/screens/foreman/foreman.draftLifecycle.model.test.ts src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts --runInBand --no-coverage
```

Result:

- 14/14 suites passed
- 83/83 tests passed

## Required gates

The required code gates passed on the final source diff for this wave:

```bash
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
npm test
git diff --check
```

## Runtime proof

Android runtime proof was required because this wave changes a live foreman draft boundary.

### First attempt

- command:

```bash
FOREMAN_RUNTIME_WEB=0 node node_modules/tsx/dist/cli.mjs scripts/foreman_request_sync_runtime_verify.ts
```

- result: failed
- blocker type: environment / dev-client bootstrap
- evidence:
  - `artifacts/android-foreman-request-sync-failure.xml`
  - `artifacts/android-foreman-request-sync-failure.png`
  - `artifacts/expo-dev-client-8081.stdout.log`
  - `artifacts/expo-dev-client-8081.stderr.log`
- exact failure surface: Expo dev client error screen with `There was a problem loading the project.` and `java.net.SocketTimeoutException`

### Bounded recovery

One bounded environment recovery was used:

- start Metro separately on `8081` with `CI=1`
- keep the existing emulator session
- rerun the same runtime verifier once

### Final runtime pass

- command:

```bash
CI=1 FOREMAN_RUNTIME_WEB=0 node node_modules/tsx/dist/cli.mjs scripts/foreman_request_sync_runtime_verify.ts
```

- result: passed
- proof summary:
  - `status: passed`
  - `androidPassed: true`
  - `runtimeVerified: true`
  - `environmentRecoveryUsed: true`
- final Android evidence:
  - `artifacts/android-foreman-request-sync-route-1.xml`
  - `artifacts/android-foreman-request-sync-route-1.png`
  - `artifacts/foreman-request-sync-runtime.summary.json`

## Residuals

- iOS runtime proof remains host-residual on Windows because `xcrun` is unavailable.
- No product-code workaround was added for this residual.

## Semantics proof

This wave preserves runtime semantics because:

- the hook still owns orchestration and React wiring
- extracted modules only moved deterministic seams out of the hook
- focused tests prove unchanged recovery/failure/source-order contracts
- Android runtime proof confirms the exact foreman route still opens after the split
