# AI Estimate Support Playbook

## Support Checks

Use these checks for staging pilot support:

1. Verify source SHA with `/api/version` and local `git rev-parse HEAD`.
2. Verify `/request` loads on the external staging URL.
3. Verify approved history opens old and latest revisions.
4. Verify PDF and buyer package refs are bound to the selected revision.
5. Verify telemetry events are in namespace `rik-staging`.
6. Verify cost budget, latency SLO, and rate limits are active.
7. Verify kill switch blocks only new AI estimate creation.
8. Verify rollback preserves approved history and ledger state.

## Redaction

Before sharing a support bundle, remove phone numbers, email addresses, token-like values, full prompts, raw model payloads, `.env` files, and raw logs. The support bundle should include only summaries and blocking reasons.

## STOP Handling

Open STOP when any of these are true:

- Staging URL is missing or localhost.
- Staging source SHA does not match HEAD.
- Android emulator evidence is missing.
- Browser proof is route-equivalent only.
- Production DB or production secret use is suspected.
- PDF, buyer package, approved history, telemetry, cost budget, or rate limits are not proven.
