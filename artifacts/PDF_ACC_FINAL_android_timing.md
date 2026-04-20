# PDF-ACC-FINAL Android Timing

Status: PASS

## Attempt

- Emulator detected: yes
- Recovery attempts: 1 bounded attempt only
- Time cap: 15 minutes
- Script: `npx tsx scripts/accountant_payment_runtime_verify.ts`
- Raw artifact: `artifacts/accountant-payment-runtime-proof.json`

## Result

- status: `GREEN`
- route: `rik:///office/accountant`
- seed RPC: `accountant_inbox_scope_v1` returned the fixture in the `К оплате` scope before UI proof
- screen opened: yes
- fixture row rendered: yes
- payment entry opened: yes
- fatal / ANR lines: none
- cleanup verified: seed proposal and temp user removed after the run

The dev-client process left Metro child processes alive after writing the GREEN artifact; those repo-context node tails were stopped before final gates.
