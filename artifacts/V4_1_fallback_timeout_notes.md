# V4-1 Fallback Timeout Hardening Notes

Date: 2026-04-25
Base commit: `956eae9914b28ee5eaa54203d7342f720ee03435`
Wave: `REL_002_FALLBACK_TIMEOUT_HARDENING`

## Goal

Harden the release startup contract by changing `expo.updates.fallbackToCacheTimeout` from `0` to `30000` without touching business logic, UI flows, SQL/RPC, runtime fingerprint policy, channels, or app identities.

## Changed Files

- `app.json`
- `src/shared/release/releaseInfo.ts`
- `src/shared/release/releaseInfo.types.ts`
- `scripts/release/releaseGuard.shared.ts`
- `scripts/release/run-release-guard.ts`
- `src/shared/release/releaseInfo.test.ts`
- `tests/release/releaseConfig.shared.test.ts`
- `tests/release/release-safety.test.ts`
- `tests/release/releaseGuard.shared.test.ts`
- `docs/operations/eas-update-runbook.md`
- `docs/operations/release-lineage-audit.md`
- `docs/operations/release-decision-matrix.md`

## Contract Update

- Before: `fallbackToCacheTimeout = 0`
- After: `fallbackToCacheTimeout = 30000`
- Guarded release startup contract now requires:
  - `updates.enabled = true`
  - `checkAutomatically = ON_LOAD`
  - `fallbackToCacheTimeout = 30000`
- `0`, missing, or invalid fallback timeout is now a release-guard failure.

## Commands Run

```powershell
git status --short
git rev-parse HEAD
git rev-parse origin/main
git diff --check
npm run release:verify -- --json

git grep -n "fallbackToCacheTimeout"
git grep -n "checkAutomatically"
git grep -n "runtimeVersion"
git grep -n "updates" -- app.json eas.json scripts tests docs

npx expo config --json --type introspect
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
npm test
git diff --check
npm run release:verify -- --json

cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
cd ..

adb logcat -c
adb install -r android\app\build\outputs\apk\release\app-release.apk
adb shell am force-stop com.azisbek_dzhantaev.rikexpoapp
adb shell monkey -p com.azisbek_dzhantaev.rikexpoapp 1
adb shell pidof com.azisbek_dzhantaev.rikexpoapp
adb shell dumpsys activity activities | findstr /i "rikexpoapp MainActivity mResumed"
adb logcat -d -t 200 *:E | findstr /i "FATAL EXCEPTION AndroidRuntime FileNotFoundException fingerprint"
```

## Key Outcome

- `runtimeVersion` remains `policy:fingerprint`
- `updates.enabled` remains `true`
- `checkAutomatically` remains `ON_LOAD`
- `fallbackToCacheTimeout` is now `30000`
- Code-facing gates passed
- Android emulator install and launch proof passed
- OTA was not published

## Release Verify Note

`npm run release:verify -- --json` before commit is expected to fail on this repo while the worktree is dirty, even when all code gates pass. In this wave, the pre-commit verify failure was procedural only:

- blocker: `Worktree is dirty. Release automation requires a clean repository state.`
- startup policy itself validated as:
  - `updatesEnabled = true`
  - `checkAutomatically = ON_LOAD`
  - `fallbackToCacheTimeout = 30000`
  - `startupPolicyValid = true`
