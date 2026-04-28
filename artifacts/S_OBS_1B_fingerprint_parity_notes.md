# S-OBS-1B-R3 Fingerprint Parity Notes

Wave: S-OBS-1B-R3 DIAGNOSE_EAS_POST_PREBUILD_FINGERPRINT_MISMATCH

## Context

- S-OBS-1 code integration is GREEN.
- S-DB-1R is GREEN.
- `.fingerprintignore` was tried with `ios`, then `ios/**/*`.
- Latest failed iOS build: `ae3da312-3afe-4b84-a223-3fddd08d4e73`.
- Failed phase: `CONFIGURE_EXPO_UPDATES`.
- Local runtime in failed build: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`.
- EAS post-prebuild runtime in failed build: `bc9c9355222395cbde647610ec48487de37efc6b`.

## Findings

- The failed build diff contains only two reported sources:
  - added generated `ios` source with reason `bareNativeDir` and `hash: null`
  - changed `node_modules/@sentry/react-native` from `a5a30c5062cf10d7a20437547326bc54b4adc6f5` to `b5472b1833d90dfd901d4193ce981eac859c09fa`
- A clean temp clone with `npm ci` produces the EAS-side Sentry hash `b5472b1833d90dfd901d4193ce981eac859c09fa`.
- The real repo's current `node_modules` still produces the stale Sentry hash `a5a30c5062cf10d7a20437547326bc54b4adc6f5`.
- iOS prebuild cannot be faithfully reproduced on this Windows host. Expo skips iOS native project generation and reports that iOS prebuild must run from macOS or Linux.
- Synthetic temp tests show `ios` remains present as a `bareNativeDir` source even when testing:
  - `.fingerprintignore`: `ios/**/*`
  - `.fingerprintignore`: `ios`, `ios/**/*`, `**/ios`, `**/ios/**/*`
  - `fingerprint.config.js` `ignorePaths: ["ios"]`
  - `fingerprint.config.js` `ignorePaths: ["ios", "ios/**/*", "**/ios", "**/ios/**/*"]`

## Decision

No safe repo fix was applied in S-OBS-1B-R3.

Reason: `@sentry/react-native` parity is explainable by stale local `node_modules`, but the generated `ios` `bareNativeDir` source still cannot be removed by `.fingerprintignore` or `fingerprint.config.js ignorePaths` in local temp diagnostics. Per recovery rules, do not guess, do not ignore `node_modules`, do not commit `ios/`, and do not change `runtimeVersion` away from `fingerprint`.

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
- EAS build triggered in R3: NO
- EAS submit triggered in R3: NO
- secrets printed: NO
- secrets committed: NO
