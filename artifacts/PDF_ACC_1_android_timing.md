# PDF-ACC-1 Android Proof

Status: PASS with teardown cleanup

## Runtime proof

- Command attempted: `npx tsx scripts/accountant_payment_runtime_verify.ts`
- Limit: one attempt, 15 minutes
- Proof artifact: `artifacts/accountant-payment-runtime-proof.json`
- Artifact status: `GREEN`
- Emulator detected: yes
- Package: `com.azisbek_dzhantaev.rikexpoapp`
- Dev client reachable: yes
- Accountant route opened: yes
- Seeded fixture row rendered: yes
- Payment entry opened: yes
- Fatal / ANR lines: 0

## Teardown note

The verifier wrote a GREEN proof artifact and then the outer shell timed out while repo-context Expo/node/adb processes were still alive. Per the wave rule, no extra verifier debugging was done. The repo-context `node` process tree and adb server were stopped manually after the proof artifact was collected.

Manual cleanup was also attempted for the temp accountant user and seeded proposal from `artifacts/accountant-payment-runtime-proof.json`.

## Timing source

Android proof verifies route and payment entry reachability. Repeat/warm open timing is enforced through the accountant payment report product telemetry samples in `artifacts/PDF_ACC_1_timing_samples.json`.
