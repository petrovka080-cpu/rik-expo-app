# V4-4 Accountant + Contractor Critical E2E Proof

## Scope Guard

- Director flow was left intact.
- Buyer, Warehouse, and Foreman flows were not changed except through the shared critical runner order that now includes Accountant and Contractor flows.
- No business logic changes.
- No SQL/RPC changes.
- No runtime/app.json changes.

## Root Cause Evidence

### Accountant

Fresh Maestro debug artifacts showed that the screen opened, but some `testID` markers were not surfaced as visible selectors in Android hierarchy dumps.

Observed proof:

- seeded supplier text was visible
- invoice number was visible
- payment status text was visible
- `payment-form-rest` was visible

The old wait on modal-root/field ids caused false negatives.

Final proof strategy:

- wait for `Поставщик: ${E2E_ACCOUNTANT_SUPPLIER}`
- assert invoice/status/rest
- assert payment-ready controls (`Банк`, `Провести оплату`)

### Contractor

Fresh Maestro debug artifacts showed the contractor work modal and success dialog really appeared, but the old proof waited on non-surfaced ids.

Observed proof:

- `Факт выполнения работы` visible
- `Готово к сохранению` visible
- `Сохранить факт` visible
- success dialog text `Готово`
- success dialog message `Факт по работе сохранён.`

Final proof strategy:

- wait on surfaced title/state text
- submit via surfaced button text
- verify success via surfaced dialog text

## Commands Run

```powershell
npm test -- --runInBand tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts
npx tsc --noEmit --pretty false
npx expo lint
npm run e2e:maestro:critical
npm test -- --runInBand
npm test
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

## Results

### Contract

- `tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts`: PASS

### Critical Suite

- targeted Accountant + Contractor rerun: `2/2 Flows Passed`
- full suite: `11/11 Flows Passed`

Passing flows in final full suite:

- Active Context Switch
- Accountant Payment
- Buyer Proposal Review
- Buyer RFQ Create
- Contractor Progress
- Director Approve Report
- Foreman Draft Submit
- Market Entry
- Office Buyer Route Roundtrip
- Office Safe Entry
- Warehouse Receive Issue

### Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `git diff --check`: PASS

### Android Emulator Proof

- release APK build: PASS
- `adb install -r`: `Success`
- app launch via `monkey`: PASS
- `pidof`: `24619`
- resumed activity: `com.azisbek_dzhantaev.rikexpoapp/.MainActivity`
- error tail scan: no matches for `FATAL EXCEPTION`, `AndroidRuntime`, `FileNotFoundException`, or `fingerprint`

## Changed Files

- `scripts/e2e/_shared/maestroCriticalBusinessSeed.ts`
- `scripts/e2e/run-maestro-critical.ts`
- `maestro/flows/critical/accountant-payment.yaml`
- `maestro/flows/critical/contractor-progress.yaml`
- `tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts`
- `src/screens/accountant/components/ListRow.tsx`
- `src/screens/accountant/components/CardModal.tsx`
- `src/screens/accountant/components/AccountantCardContent.tsx`
- `src/screens/contractor/components/ContractorSubcontractsList.tsx`
- `src/screens/contractor/components/ContractorWorkModal.tsx`
- `src/screens/contractor/components/WorkModalOverviewSection.tsx`

## Release Guard

Final `release:verify` must be run after commit/push because the guard requires a clean worktree and `HEAD == origin/main`. That post-push verdict is the last step before declaring the wave fully GREEN.
