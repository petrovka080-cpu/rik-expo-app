# W3.1 ActivePaymentForm Inline Style Extraction Proof

## Baseline

- Base commit before this slice: `22f9b95e980faa4db2faecfb89b446ddf32ed85c`
- `HEAD == origin/main` before edits
- Roadmap priority source: `artifacts/ROADMAP_8_4_to_9_7_audit_2026_04_25.md`
- Selected next open wave: `Wave 3 - INLINE_STYLE_HOTPATH_EXTRACTION`

## Changed files

- `src/screens/accountant/components/ActivePaymentForm.tsx`
- `src/screens/accountant/components/ActivePaymentForm.test.tsx`

## Diff summary

```text
src/screens/accountant/components/ActivePaymentForm.test.tsx | 18 +++
src/screens/accountant/components/ActivePaymentForm.tsx      | 174 ++++++++++++---------
2 files changed, 121 insertions(+), 71 deletions(-)
```

## Root-cause proof

The slice removed render-time style builders from the hot form surface and replaced them with stable `StyleSheet` entries.

Focused source markers after the extraction:

```text
src/screens/accountant/components/ActivePaymentForm.tsx:274: ps.segBtnBase
src/screens/accountant/components/ActivePaymentForm.tsx:360: ps.pillBoxText
src/screens/accountant/components/ActivePaymentForm.tsx:378: allocOk ? ps.allocBoxOk : ps.allocBoxWarn
src/screens/accountant/components/ActivePaymentForm.tsx:408: ps.smallBtnBase
src/screens/accountant/components/ActivePaymentForm.tsx:496: ps.miniBtnBase
src/screens/accountant/components/ActivePaymentForm.tsx:642: opacity90: { opacity: 0.9 }
src/screens/accountant/components/ActivePaymentForm.tsx:649: segBtnBase: {
src/screens/accountant/components/ActivePaymentForm.tsx:665: smallBtnBase: {
src/screens/accountant/components/ActivePaymentForm.tsx:675: miniBtnBase: {
src/screens/accountant/components/ActivePaymentForm.tsx:754: allocBoxOk: { borderColor: "rgba(34,197,94,0.35)" }
```

The focused regression test also asserts that the old render-time builders are gone.

## Commands run

```powershell
npm test -- --runInBand src/screens/accountant/components/ActivePaymentForm.test.tsx
npx tsc --noEmit --pretty false
git diff --check
npx expo lint
npm test -- --runInBand
npm test

cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
cd ..

adb logcat -c
adb install -r android\app\build\outputs\apk\release\app-release.apk
adb shell am force-stop com.azisbek_dzhantaev.rikexpoapp
adb shell am start -W -n com.azisbek_dzhantaev.rikexpoapp/.MainActivity
adb shell pidof com.azisbek_dzhantaev.rikexpoapp
adb shell dumpsys activity activities
adb logcat -d -t 200 '*:E'

npm run e2e:maestro:critical
```

## Gate results

- `npm test -- --runInBand src/screens/accountant/components/ActivePaymentForm.test.tsx`: pass
- `npx tsc --noEmit --pretty false`: pass
- `git diff --check`: pass
- `npx expo lint`: pass
- `npm test -- --runInBand`: pass
- `npm test`: pass

## Android release emulator proof

- `.\gradlew.bat clean`: pass
- `.\gradlew.bat assembleRelease`: pass
- `adb install -r ...app-release.apk`: `Success`
- `adb shell am start -W -n com.azisbek_dzhantaev.rikexpoapp/.MainActivity`:
  - `Status: ok`
  - `LaunchState: COLD`
  - `Activity: com.azisbek_dzhantaev.rikexpoapp/.MainActivity`
  - `TotalTime: 1366`
  - `WaitTime: 1374`
- `adb shell pidof com.azisbek_dzhantaev.rikexpoapp`: `3838`
- `adb shell dumpsys activity activities` confirmed:
  - `topResumedActivity=ActivityRecord{... com.azisbek_dzhantaev.rikexpoapp/.MainActivity ...}`
  - `ResumedActivity: ActivityRecord{... com.azisbek_dzhantaev.rikexpoapp/.MainActivity ...}`
- `adb logcat -d -t 200 '*:E'` filtered for `FATAL EXCEPTION|AndroidRuntime|FileNotFoundException|fingerprint`: no matches

## Critical E2E proof

- `npm run e2e:maestro:critical`: pass
- Final result: `8/8 Flows Passed`
- Warehouse runtime verifier before Maestro: `status=passed`, `gate=GREEN`, `classification=ready`

## Release status at artifact creation time

- Code/runtime proof for this slice: `GREEN candidate`
- Final post-push `release:verify` and OTA disposition are intentionally deferred to clean release discipline
