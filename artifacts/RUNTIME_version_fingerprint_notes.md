# RUNTIME_VERSION_FINGERPRINT_DISCIPLINE

## Root Cause

- `app.json` pinned `expo.runtimeVersion` to the fixed string `1.0.0`.
- `expo.extra.release.runtimePolicy` also declared `fixed`, so the repository-level release story still assumed a manually pinned runtime.
- Release diagnostics and safety tests reflected the fixed-runtime model, which left a compatibility gap: native/runtime-affecting changes could still appear compatible to OTA tooling until a human remembered to bump the pinned value.

## Exact Scope

- `app.json`
- `src/shared/release/releaseInfo.ts`
- `src/shared/release/releaseInfo.test.ts`
- `tests/release/releaseConfig.shared.test.ts`
- `tests/release/releaseGuard.shared.test.ts`
- `tests/release/release-safety.test.ts`

## What Changed

- Switched `expo.runtimeVersion` from a fixed string to `{ "policy": "fingerprint" }`.
- Mirrored the same policy in `expo.extra.release.runtimePolicy`.
- Updated release summary risks so the repo now reports the fingerprint policy truthfully instead of emitting a fixed-runtime warning.
- Added release tests that prove:
  - app config really uses fingerprint policy
  - fixed-runtime warnings stay explicit only for pinned runtimes
  - guarded OTA is blocked for build-required/runtime-policy changes
  - release safety contracts no longer expect `runtimeVersion === version`

## What Intentionally Did Not Change

- No business logic.
- No role flows.
- No routing/auth/PDF semantics.
- No OTA publish path behavior beyond honest classification.
- No runtime data model or UI semantics.

## Production-Safe Outcome

- Runtime compatibility now tracks Expo fingerprint policy instead of a stale fixed string.
- Guarded release tooling still classifies this wave as `new-build` / OTA-blocked, which is the correct behavior for a runtime policy change.
- Existing JS/runtime behavior for users stays unchanged; only release compatibility discipline is hardened.
