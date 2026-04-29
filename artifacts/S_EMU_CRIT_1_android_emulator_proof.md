# S-EMU-CRIT-1 Android Emulator Critical Smoke Proof

Status: GREEN_EMULATOR_CRITICAL_SMOKE

Owner goal: 10K/50K+ readiness.

Android emulator smoke is a release/runtime proof, not a 10K/50K capacity proof.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
Production/staging touched: NO.
OTA/EAS triggered: NO.
Native/package config changed: NO.
Full business E2E claimed: NO unless critical flows actually passed.

## Why This Proof Is Needed

The repository already has broad code-level hardening, pagination, RPC validation, BFF scaffolds, local BFF shadow proof, and release gates. Those gates do not prove that the current Android runtime can install, cold-start, avoid immediate Android fatal crashes, and render the first safe screen on an emulator.

This wave proves release/runtime stability only. It does not prove 10K load capacity, 50K capacity, production DB index readiness, physical Android readiness, or Play Market readiness.

## Precheck

- Worktree clean before emulator work: YES.
- HEAD: `e4412fb85224b2db71de32b9a199af7ff06e01fe`.
- HEAD == origin/main before emulator work: YES.
- `git diff --check`: PASS.
- `npm run release:verify -- --json`: PASS before emulator work.
- OTA/EAS action from release verification: NO.

## Discovery

Existing repo support found:

- `npm run e2e:maestro:critical`
- `scripts/e2e/run-maestro-critical.ts`
- `maestro/flows/infra-launch.yaml`
- `maestro/flows/critical/*.yaml`
- package name: `com.azisbek_dzhantaev.rikexpoapp`
- main activity: `com.azisbek_dzhantaev.rikexpoapp/.MainActivity`

Tooling state:

- `adb version`: available.
- `adb devices`: `emulator-5554 device`.
- `emulator -list-avds`: unavailable in PATH.
- `maestro --version`: unavailable in PATH.

Because Maestro CLI is unavailable, the wave used local emulator launch/login smoke, not full Maestro business E2E.

## Build / Install Mode

Local Gradle build was used from the existing Android project:

```text
cd android
gradlew.bat assembleDebug
gradlew.bat assembleRelease
```

The debug APK launched the Expo dev launcher, which is useful process proof but not a full app/login proof. The release APK embedded the JS bundle and was used for the actual runtime smoke:

```text
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

APK/build outputs were not staged and were not committed.

## Runtime Smoke

Commands:

```text
adb shell am force-stop com.azisbek_dzhantaev.rikexpoapp
adb logcat -c
adb shell am start -W -n com.azisbek_dzhantaev.rikexpoapp/.MainActivity
adb logcat -d > artifacts/S_EMU_CRIT_1_logcat_raw_LOCAL_DO_NOT_COMMIT.txt
adb shell uiautomator dump /sdcard/S_EMU_CRIT_1_window.xml
adb pull /sdcard/S_EMU_CRIT_1_window.xml artifacts/S_EMU_CRIT_1_window_LOCAL_DO_NOT_COMMIT.xml
```

Launch result:

```text
Status: ok
LaunchState: COLD
Activity: com.azisbek_dzhantaev.rikexpoapp/.MainActivity
TotalTime: 2006
WaitTime: 2021
```

First safe screen:

- Login screen visible: YES.
- `auth.login.email` visible: YES.
- `auth.login.password` visible: YES.
- `auth.login.submit` visible: YES.

## Crash Log Summary

Raw logcat was captured locally and not committed.

Redacted summary committed:

- `artifacts/S_EMU_CRIT_1_logcat_summary_redacted.txt`

Crash signatures:

- `FATAL EXCEPTION`: NO.
- `AndroidRuntime`: NO.
- `Process .* has died`: NO.

## Maestro / Critical Flow Status

- Maestro CLI: missing from PATH.
- Full Maestro critical suite: skipped, exact blocker documented.
- Critical smoke performed: local release APK install + cold launch + login screen selector proof + logcat crash scan.
- Full business E2E claimed: NO.
- Safe test credentials used: NO.

## Safety Confirmations

- Production touched: NO.
- Staging touched: NO.
- Production writes: NO.
- Staging writes: NO.
- Play Market / Android submit touched: NO.
- EAS build triggered: NO.
- EAS submit triggered: NO.
- EAS update triggered: NO.
- OTA published: NO.
- SQL/RPC/RLS/storage changed: NO.
- Package/native config changed: NO.
- Business logic changed: NO.
- App behavior changed: NO.
- Selector-only source changes: NO.
- Secrets printed: NO values printed.
- Secrets committed: NO.
- Raw logcat committed: NO.
- APK/AAB/build outputs committed: NO.

## Gates

Pre-emulator:

- `git diff --check`: PASS.
- `npx tsc --noEmit --pretty false`: PASS through `release:verify`.
- `npx expo lint`: PASS through `release:verify`.
- `npm test -- --runInBand`: PASS through `release:verify`.
- `npm test`: PASS through `release:verify`.
- `npm run release:verify -- --json`: PASS.

Post-emulator gates are recorded in final status after committing these proof artifacts.

## Next Recommended Wave

- S-LOAD-3 if safe staging env exists and load proof is still missing.
- Otherwise S-DB-5 rerun if explicit production read-only metadata env exists.
- Otherwise S-PAG-6 / S-RPC-4 based on latest remaining query/RPC counts.
