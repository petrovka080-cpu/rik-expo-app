# RUNTIME_VERSION_FINGERPRINT_DISCIPLINE Proof

## Focused Proof

### Config / summary

- `npx tsx scripts/release/print-release-config.ts`
- Result:
  - `runtimeVersion: policy:fingerprint`
  - `runtimePolicy: policy:fingerprint`

### Focused tests

- `npx jest tests/release/release-safety.test.ts tests/release/releaseGuard.shared.test.ts tests/release/releaseConfig.shared.test.ts src/shared/release/releaseInfo.test.ts --runInBand --no-coverage`
- Result: PASS

### Full gates

- `npx tsc --noEmit --pretty false` - PASS
- `npx expo lint` - PASS
- `npm test -- --runInBand` - PASS
- `npm test` - PASS
- `git diff --check` - PASS

### Guarded release proof

- Commit:
  - `d0548f2abec3b7e99f6783115c18f65d8bce9eda`
- Push:
  - `origin/main` now points to `d0548f2abec3b7e99f6783115c18f65d8bce9eda`
- Guarded OTA dry-run:
  - `npx tsx scripts/release/run-release-guard.ts ota --dry-run --channel production --message "Release: adopt fingerprint runtime policy" --range "f093a57760c035d494d0bd41c9ecabd0005da3aa..d0548f2abec3b7e99f6783115c18f65d8bce9eda"`
  - Result:
    - `Classification: build-required`
    - `OTA disposition: block`
    - blocker: `Release classification requires a new build. OTA publish is blocked.`

## Before / After

### Before

- App config used fixed runtime string `1.0.0`
- Release safety expected `expo.runtimeVersion === expo.version`
- Release summary treated the project as pinned-runtime

### After

- App config uses fingerprint runtime policy
- Release safety expects the fingerprint object plus mirrored release extra
- Release summary reports fingerprint-specific build compatibility guidance

## Semantics Check

- Business semantics changed: no
- User-facing UI semantics changed: no
- Release compatibility policy changed: yes
- OTA allowed for this wave: no
- New build required for this wave: yes

## Honest Release Classification

- This wave changes `app.json` runtime policy.
- Guarded release automation classifies it as `build-required`.
- OTA is blocked and must be replaced by fresh binaries for each target channel.
