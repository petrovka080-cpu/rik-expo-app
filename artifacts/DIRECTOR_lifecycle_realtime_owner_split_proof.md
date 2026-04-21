# DIRECTOR lifecycle realtime owner split proof

## Code gates

- `npx jest src/screens/director/director.lifecycle.scope.test.ts src/screens/director/director.lifecycle.refresh.test.ts src/screens/director/director.lifecycle.realtime.test.tsx src/screens/director/director.invalidation.boundary.test.ts tests/director/directorLifecycleOwnerSplit.decomposition.test.ts --runInBand --no-coverage` -> PASS
- `npx tsc --noEmit --pretty false` -> PASS
- `npx expo lint` -> PASS
- `npx jest src/lib/lifecycle/lifecycle.s3.test.ts tests/perf/performance-budget.test.ts --runInBand --no-coverage` -> PASS
- `npm test -- --runInBand` -> PASS
- `npm test` -> PASS
- `git diff --check` -> PASS

## Web runtime proof

Exact proof route:

- `/office/director`

Exact raw proof artifacts:

- `artifacts/director-lifecycle-realtime-owner-web.json`
- `artifacts/director-lifecycle-realtime-owner-web.log`
- `artifacts/director-lifecycle-realtime-owner-web.png`

Result:

- Web proof status: `GREEN`
- No blocking console errors
- No page errors
- No bad responses
- Finance realtime: subscription started, connected, mutation event received, refresh triggered, canonical fetch preserved, no cross-scope reload, no duplicate fetch
- Reports realtime: subscription started, connected, mutation event received, refresh triggered, canonical fetch preserved, no cross-scope reload, no duplicate fetch

Important proof note:

- The historical `/director` verifier path is stale on web and currently resolves to a not-found surface.
- The live Director runtime surface is `/office/director`, so the wave proof was run against that actual route.
- Reports realtime mutation used `requests.note`, not `request_items.note`, because the current backend guard correctly blocks content mutation on submitted request items.

## Native runtime proof

Native result for this wave is classified as `BLOCKED`.

What happened:

1. A full Android finance verifier run was attempted on a dedicated dev-client port.
2. That verifier exceeded the allowed runtime window and devolved into environment noise rather than a clean app-code verdict.
3. One recovery attempt was used:
   - `adb kill-server`
   - `adb start-server`
   - `adb devices`
4. All three adb recovery commands timed out, so no further Android retries were performed.

Why this is `BLOCKED` instead of `FAIL`:

- The web proof already demonstrated the changed lifecycle/realtime owner path end to end.
- The Android blocker was infrastructure-level `adb` unavailability after the first recovery attempt, not a reproduced Director screen regression.
- Per the wave discipline, the environment was not allowed to become a separate debugging project.

Supporting native environment traces:

- `artifacts/director-dev-client-8082.stdout.log`
- `artifacts/director-dev-client-8082.stderr.log`

## Structural proof

The decomposition is additionally proven by tests:

- `tests/director/directorLifecycleOwnerSplit.decomposition.test.ts`

That guard verifies:

- extracted lifecycle modules exist
- `director.lifecycle.ts` imports the extracted owners
- no raw realtime channel creation remains in the entry hook
- no inlined refresh owner logic remains in the entry hook
- no `eslint-disable` remains in the lifecycle entry file

## Conclusion

The exact Director lifecycle/realtime owner split is code-green and web-runtime-green.

Native proof is honestly classified as `BLOCKED` after one bounded recovery attempt, with no evidence of an app regression on the changed Director lifecycle path.
