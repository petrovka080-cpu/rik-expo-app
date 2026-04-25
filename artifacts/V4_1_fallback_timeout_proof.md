# V4-1 Fallback Timeout Hardening Proof

## Before / After

- Before `HEAD:app.json`: `expo.updates.fallbackToCacheTimeout = 0`
- After working tree `app.json`: `expo.updates.fallbackToCacheTimeout = 30000`

## Expo Config Proof

Command:

```powershell
npx expo config --json --type introspect
```

Observed proof:

- `runtimeVersion.policy = "fingerprint"`
- `updates.enabled = true`
- `updates.checkAutomatically = "ON_LOAD"`
- `updates.fallbackToCacheTimeout = 30000`
- iOS introspection:
  - `EXUpdatesEnabled = true`
  - `EXUpdatesCheckOnLaunch = ALWAYS`
  - `EXUpdatesLaunchWaitMs = 30000`
  - `EXUpdatesRuntimeVersion = file:fingerprint`
- Android introspection:
  - `expo.modules.updates.ENABLED = true`
  - `expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH = ALWAYS`
  - `expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS = 30000`
  - `expo_runtime_version = file:fingerprint`

## Changed Files

```text
app.json
docs/operations/eas-update-runbook.md
docs/operations/release-decision-matrix.md
docs/operations/release-lineage-audit.md
scripts/release/releaseGuard.shared.ts
scripts/release/run-release-guard.ts
src/shared/release/releaseInfo.test.ts
src/shared/release/releaseInfo.ts
src/shared/release/releaseInfo.types.ts
tests/release/release-safety.test.ts
tests/release/releaseConfig.shared.test.ts
tests/release/releaseGuard.shared.test.ts
```

## Gates

- `npx tsc --noEmit --pretty false` -> PASS
- `npx expo lint` -> PASS
- `npm test -- --runInBand` -> PASS
- `npm test` -> PASS
- `git diff --check` -> PASS

Pre-commit release verify:

- `npm run release:verify -- --json` -> expected FAIL
- Reason: dirty worktree only
- Guard output still confirmed:
  - `headMatchesOriginMain = true`
  - `startupPolicyValid = true`
  - `fallbackToCacheTimeout = 30000`
  - blocker list contained only `Worktree is dirty. Release automation requires a clean repository state.`

## Android Emulator Proof

Build:

- `.\gradlew.bat clean` -> PASS
- `.\gradlew.bat assembleRelease` -> PASS
- APK: `android\app\build\outputs\apk\release\app-release.apk`
- APK size: `106975680` bytes
- APK timestamp: `2026-04-25 10:46:29`

Install and launch:

- `adb install -r ...` -> `Success`
- `adb shell monkey -p com.azisbek_dzhantaev.rikexpoapp 1` -> `Events injected: 1`
- `adb shell pidof com.azisbek_dzhantaev.rikexpoapp` -> `31081`

Main activity proof:

- `adb shell dumpsys activity activities | findstr /i "rikexpoapp MainActivity mResumed"` showed:
  - `topResumedActivity=ActivityRecord{... com.azisbek_dzhantaev.rikexpoapp/.MainActivity ...}`
  - `ResumedActivity: ActivityRecord{... .MainActivity ...}`
  - `mCurrentFocus=Window{... MainActivity}`

Crash scan:

- `adb logcat -d -t 200 *:E | findstr /i "FATAL EXCEPTION AndroidRuntime FileNotFoundException fingerprint"` returned no matches

## Verdict At Artifact Creation Time

- Code/config change scope respected
- Runtime fingerprint preserved
- Startup policy hardened to `30000`
- All code-facing gates passed
- Android emulator proof passed
- OTA not published
- Final GREEN still requires commit/push and a post-push `npm run release:verify -- --json`
