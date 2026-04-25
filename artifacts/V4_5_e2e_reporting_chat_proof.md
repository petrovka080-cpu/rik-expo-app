# V4-5 E2E Reporting And Chat Proof

## Result

`V4-5` is green at the pre-commit gate level.

- Added flow coverage: `chat-message`, `contractor-pdf-smoke`, `director-report-pdf-smoke`
- Full critical suite result: `14/14 PASS`
- Existing business flows remained green

## Root Cause And Fix Summary

1. Fresh Android release installs could become visible to `adb install` before the package was fully ready to launch.
   The Maestro runner now resolves the launchable activity and retries `am start -W` until the app is truly launchable.

2. Chat needed stable automation selectors on the composer and send action.
   The screen now exposes stable `testID` and `accessibilityLabel` values for the thread list, composer input, and send button.

3. While touching the active wave files, readable text was normalized in the chat UI, the chat Maestro flow, the contractor PDF flow, and the contract test.
   No behavior was changed by this text cleanup.

## Changed Files

- `scripts/e2e/_shared/maestroCriticalBusinessSeed.ts`
- `scripts/e2e/run-maestro-critical.ts`
- `src/features/chat/ChatScreen.tsx`
- `tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts`
- `maestro/flows/critical/chat-message.yaml`
- `maestro/flows/critical/contractor-pdf-smoke.yaml`
- `maestro/flows/critical/director-report-pdf-smoke.yaml`

## Commands And Results

### Contract

```powershell
npm test -- --runInBand tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts
```

Result: `PASS`

### Critical Suite

```powershell
npm run e2e:maestro:critical
```

Result: `14/14 Flows Passed`

Passed flows:

- Active Context Switch
- Accountant Payment
- Buyer Proposal Review
- Buyer RFQ Create
- Chat Message
- Contractor Progress
- Contractor PDF Smoke
- Director Approve Report
- Director Report PDF Smoke
- Foreman Draft Submit
- Market Entry
- Office Buyer Route Roundtrip
- Office Safe Entry
- Warehouse Receive Issue

### Static Gates

```powershell
npx tsc --noEmit --pretty false
npx expo lint
git diff --check
```

Results:

- `tsc`: `PASS`
- `expo lint`: `PASS`
- `git diff --check`: `PASS`

### Test Gates

```powershell
npm test -- --runInBand
npm test
```

Results:

- `npm test -- --runInBand`: `PASS`
- `npm test`: `PASS`

### Android Release Proof

```powershell
cd android
.\gradlew.bat assembleRelease
cd ..
adb logcat -c
adb install -r android\app\build\outputs\apk\release\app-release.apk
adb shell am force-stop com.azisbek_dzhantaev.rikexpoapp
adb shell monkey -p com.azisbek_dzhantaev.rikexpoapp 1
adb shell pidof com.azisbek_dzhantaev.rikexpoapp
adb shell dumpsys activity activities | findstr /i "rikexpoapp MainActivity mResumed topResumedActivity ResumedActivity"
adb logcat -d -t 200 *:E | findstr /i "FATAL EXCEPTION AndroidRuntime FileNotFoundException fingerprint"
```

Results:

- `assembleRelease`: `PASS`
- bundle/build: completed successfully
- `adb install -r`: `Success`
- launch: `PASS`
- `pidof`: `18307`
- `MainActivity`: resumed and top-resumed
- error scan: no `FATAL EXCEPTION`, no `FileNotFoundException`, no `fingerprint` hits

## Release Guard

At artifact creation time, the repository is intentionally dirty because this wave has not been committed yet.
The final `release:verify` result is executed after `commit/push` on a clean synced `HEAD`.
