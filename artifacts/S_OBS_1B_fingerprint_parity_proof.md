# S-OBS-1B Fingerprint Parity Proof

## Repo

- HEAD before recovery continuation: `b29a7fa7699f0fa65ac9c517fe6a6f9b07bf246d`
- origin/main before recovery continuation: `b29a7fa7699f0fa65ac9c517fe6a6f9b07bf246d`
- worktree clean before builds: YES
- `.fingerprintignore` content: `ios/**/*`
- `ios/` tracked file count: `0`
- Android tracked files: YES

## Failed Builds Before Recovery

- `b56043da-e4b4-4765-a845-9b1cd7c57a22`
- `589df034-a1af-422f-ae76-2f4b67315556`
- `575d52ff-dd8d-41bb-bc05-b7de913e0618`
- `ae3da312-3afe-4b84-a223-3fddd08d4e73`

## Root Cause Proof

- latest failed build ID: `ae3da312-3afe-4b84-a223-3fddd08d4e73`
- failed phase: `CONFIGURE_EXPO_UPDATES`
- failed local runtime: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`
- failed EAS post-prebuild runtime: `bc9c9355222395cbde647610ec48487de37efc6b`
- failed Sentry before hash: `a5a30c5062cf10d7a20437547326bc54b4adc6f5`
- failed Sentry after hash: `b5472b1833d90dfd901d4193ce981eac859c09fa`
- action taken: `npm ci` in the real repo
- local Sentry hash after `npm ci`: `b5472b1833d90dfd901d4193ce981eac859c09fa`
- local iOS fingerprint after `npm ci`: `bc9c9355222395cbde647610ec48487de37efc6b`
- repeated local iOS fingerprint stable: YES

## Build Proof

- iOS build ID: `f4fdc013-8711-453a-9327-91135cac8e17`
- iOS build status: SUCCESS
- iOS buildNumber: `37`
- iOS runtimeVersion: `bc9c9355222395cbde647610ec48487de37efc6b`
- iOS fingerprint compare: PASS
- iOS source maps: VERIFIED in build logs
- iOS source map Debug ID: `fed342af-b722-41ba-958a-77ccc1fc215e`
- Android build ID: `0d409bde-0b05-41a6-9a89-15b7ed38404e`
- Android build status: SUCCESS
- Android versionCode: `7`
- Android runtimeVersion: `e3c22d631d57451c90f868829ff30f13895b0dbc`
- Android fingerprint compare: PASS
- Android source maps: VERIFIED in build logs
- Android source map Debug ID: `b88256c5-3868-4854-abda-76d870f5ec46`

## Submit Proof

- iOS submit: SUCCESS
- iOS submission ID: `d7fc8183-3217-4582-a8df-b6221f2c5a6c`
- iOS result: binary uploaded to App Store Connect for Apple processing
- Android submit: BLOCKED
- Android blocker: Google Service Account Keys cannot be set up in `--non-interactive` mode

## Gates

- pre-build `npx tsc --noEmit --pretty false`: PASS
- pre-build `npx expo lint`: PASS
- pre-build `npm run release:verify -- --json`: PASS
- iOS build: PASS
- Android build: PASS
- iOS fingerprint compare: PASS
- Android fingerprint compare: PASS
- iOS source maps: PASS
- Android source maps: PASS
- iOS submit: PASS
- Android submit: BLOCKED

## Forbidden Changes

- runtimeVersion policy changed: NO
- business logic changed: NO
- UI changed: NO
- SQL/RPC changed: NO
- Maestro YAML changed: NO
- package changed: NO
- app config changed: NO
- release guard weakened: NO
- `node_modules` ignored broadly: NO
- `ios/` committed: NO
- `android/` changed: NO
- OTA published: NO
- secrets printed: NO
- secrets committed: NO

## Conclusion

S-OBS-1B-R3 remains BLOCKED only because Android submit credentials are missing for non-interactive EAS submit.

The original iOS fingerprint mismatch is resolved, both production binaries are built with Sentry, source maps are verified for both platforms, and iOS has been submitted. Android needs Google Play service account credentials configured in EAS before submit can be completed.
