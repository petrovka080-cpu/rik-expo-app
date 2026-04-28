# S-OBS-1B-R3 Fingerprint Parity Proof

## Repo

- HEAD before R3: `bb8bdb30cb728265cac3e24d19d82bdf6a201362`
- origin/main before R3: `bb8bdb30cb728265cac3e24d19d82bdf6a201362`
- worktree clean before R3 diagnostics: YES
- `.fingerprintignore` content: `ios/**/*`
- `fingerprint.config.js` existed before R3: NO
- `ios/` local directory existed before R3: NO
- `ios/` tracked file count: `0`
- Android tracked files: YES

## Failed Builds

- `b56043da-e4b4-4765-a845-9b1cd7c57a22`
- `589df034-a1af-422f-ae76-2f4b67315556`
- `575d52ff-dd8d-41bb-bc05-b7de913e0618`
- `ae3da312-3afe-4b84-a223-3fddd08d4e73`

## Latest Failed Build

- failed build ID: `ae3da312-3afe-4b84-a223-3fddd08d4e73`
- failed status: `ERRORED`
- failed platform: `IOS`
- failed phase: `CONFIGURE_EXPO_UPDATES`
- git commit: `bb8bdb30cb728265cac3e24d19d82bdf6a201362`
- app version/build number: `1.0.0 / 36`
- runtimeVersion stored on build: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`
- EAS post-prebuild runtimeVersion: `bc9c9355222395cbde647610ec48487de37efc6b`
- build image: `sdk-54`
- Node.js: `20.19.4`
- package manager command: `npm ci --include=dev`

## Latest Fingerprint Diff

Reported by EAS `CONFIGURE_EXPO_UPDATES`:

- added source:
  - type: `dir`
  - filePath: `ios`
  - reasons: `bareNativeDir`
  - hash: `null`
- changed source:
  - filePath: `node_modules/@sentry/react-native`
  - reasons: `rncoreAutolinkingIos`, `expoConfigPlugins`
  - before hash: `a5a30c5062cf10d7a20437547326bc54b4adc6f5`
  - after hash: `b5472b1833d90dfd901d4193ce981eac859c09fa`

## Temp Reproduction

- temp clean clone path: `%TEMP%/rik-expo-fingerprint-repro-clean`
- temp install command: `npm ci`
- temp iOS prebuild attempted: YES
- temp iOS prebuild result: NOT AVAILABLE on this Windows host
- prebuild message: Expo skipped iOS native project generation and requires macOS or Linux for iOS prebuild
- temp clean fingerprint root before synthetic `ios/`: `9631e1a79e546825a10033859cb3e1fb216a3459`
- temp clean `@sentry/react-native` dir hash: `b5472b1833d90dfd901d4193ce981eac859c09fa`
- real repo current `@sentry/react-native` dir hash: `a5a30c5062cf10d7a20437547326bc54b4adc6f5`

## Ignore Pattern Tests

Synthetic temp `ios/` directory was used only to test whether fingerprint ignore config removes the `bareNativeDir` source.

- `.fingerprintignore` `ios/**/*`: `ios` source still present with reason `bareNativeDir`
- `.fingerprintignore` `ios`, `ios/**/*`, `**/ios`, `**/ios/**/*`: `ios` source still present with reason `bareNativeDir`
- `fingerprint.config.js` `ignorePaths: ["ios"]`: `ios` source still present with reason `bareNativeDir`
- `fingerprint.config.js` `ignorePaths: ["ios", "ios/**/*", "**/ios", "**/ios/**/*"]`: `ios` source still present with reason `bareNativeDir`
- `sourceSkips` checked: available skips cover Expo config/package scripts/gitignore/extra, not `bareNativeDir`

## Conclusion

S-OBS-1B-R3 is BLOCKED.

The `@sentry/react-native` diff is explainable as local dependency parity drift and should be cleared by a clean `npm ci` before triggering a future build. However, the generated `ios` `bareNativeDir` diff cannot be removed by the tested `.fingerprintignore` or `fingerprint.config.js ignorePaths` approaches, and true iOS post-prebuild cannot be reproduced on this Windows host.

No iOS build retry was started in R3 because no durable fingerprint config fix was proven.

## Gates

- precheck `git status --short`: clean
- precheck `HEAD == origin/main`: YES
- precheck `git diff --check`: PASS
- precheck `npm run release:verify -- --json`: PASS
- R3 build retry: NOT RUN
- Android build: NOT RUN
- submit: NOT RUN

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
- OTA published: NO
- secrets printed: NO
- secrets committed: NO
