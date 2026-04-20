# PDF-ACC-FINAL Android Timing

Status: ANDROID BLOCKED

## Attempt

- Emulator detected: yes (`emulator-5554`)
- Recovery attempts: 1 bounded attempt only
- Time cap: 15 minutes
- Script: `npx tsx scripts/accountant_payment_runtime_verify.ts`
- Raw artifact: `artifacts/accountant-payment-runtime-proof.json`

## Result

The dev-client environment started, but the Android accountant route did not settle before the 15 minute cap. The raw artifact reports:

- status: `NOT GREEN`
- route: `rik:///accountant`
- failure: route did not settle
- recovery used: environment recovery, blank surface recovery

Per wave rule, this is recorded as environment `ANDROID BLOCKED`; no extra adb/verifier debugging was done.
