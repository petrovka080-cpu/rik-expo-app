# S-OBS-1B Fingerprint Parity Notes

Wave: S-OBS-1B-R3 DIAGNOSE_EAS_POST_PREBUILD_FINGERPRINT_MISMATCH

## Context

- S-OBS-1 code integration is GREEN.
- S-DB-1R is GREEN.
- `.fingerprintignore` was tried with `ios`, then `ios/**/*`.
- Latest failed iOS build before recovery: `ae3da312-3afe-4b84-a223-3fddd08d4e73`.
- Failed phase: `CONFIGURE_EXPO_UPDATES`.
- Local runtime in failed build: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`.
- EAS post-prebuild runtime in failed build: `bc9c9355222395cbde647610ec48487de37efc6b`.

## Root Cause

- The durable root cause was stale local `node_modules`, specifically `node_modules/@sentry/react-native`.
- A clean `npm ci` in the real repo aligned local dependency fingerprint parity with EAS.
- After `npm ci`, local iOS fingerprint became `bc9c9355222395cbde647610ec48487de37efc6b`, matching the failed EAS post-prebuild runtime.
- Repeated local iOS fingerprint generation was stable.

## Recovery Result

- iOS production build succeeded: `f4fdc013-8711-453a-9327-91135cac8e17`.
- Android production build succeeded: `0d409bde-0b05-41a6-9a89-15b7ed38404e`.
- iOS successful build fingerprint compare passed.
- Android successful build fingerprint compare passed.
- iOS Sentry source map upload was verified in build logs via `Source Map Upload Report` and Debug ID.
- Android Sentry source map upload was verified in build logs via `Source Map Upload Report` and Debug ID.
- iOS submit succeeded and the binary was uploaded to App Store Connect.
- Android submit is BLOCKED because Google Service Account Keys cannot be set up in `--non-interactive` mode.

## Safety

- `ios/` committed: NO
- `android/` changed: NO
- runtimeVersion policy changed: NO
- business logic changed: NO
- UI changed: NO
- SQL/RPC changed: NO
- Maestro YAML changed: NO
- package/app config changed: NO
- OTA published: NO
- EAS build triggered: YES
- EAS submit triggered: YES
- secrets printed: NO
- secrets committed: NO

## Status

S-OBS-1B-R3 is BLOCKED only on Android submit credentials.

The production Sentry binaries were built successfully for both platforms, and iOS was submitted. Android requires a Google Play service account key configured in EAS credentials before a non-interactive submit can complete.
