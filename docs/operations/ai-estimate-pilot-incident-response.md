# AI Estimate Pilot Incident Response

This incident response is staging-first. It is not production release authority.

## Triage

1. Freeze staging RC claims and keep `fake_green_claimed=false`.
2. Run `npx tsx scripts/e2e/checkAiEstimateStagingHealth.ts`.
3. Run `npx tsx scripts/e2e/checkStagingVersionLineage.ts`.
4. Record the exact blocking reason: source SHA mismatch, URL missing, auth wall, PDF/buyer artifact failure, telemetry redaction failure, cost/rate limit failure, or Android emulator proof missing.

## Containment

1. Enable the staging AI estimate kill switch.
2. Confirm approved history, existing PDFs, and buyer packages remain readable.
3. Keep production DB untouched.

## Rollback

1. Roll back staging pilot flags only.
2. Preserve the sandbox ledger and approved history.
3. Do not delete migrations, ledgers, PDFs, buyer packages, or history.

## Escalation

Escalate to owner review only with a redacted support bundle and a STOP summary when green is not proven. Never replace real browser or emulator evidence with route-equivalent checks.
