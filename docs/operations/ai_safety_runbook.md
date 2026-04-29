# AI Safety Runbook

## Director Proposal Risk Summary Pilot

Pilot action: `director.proposal.risk_summary`.

Default state:

- UI visible by default: no.
- External AI calls enabled by default: no.
- Autonomous approval/rejection/payment/stock mutation: no.

## Enablement

Enable only after owner approval and release review:

1. Set `EXPO_PUBLIC_AI_DIRECTOR_PROPOSAL_RISK_SUMMARY=1`.
2. Wire a server-approved provider.
3. Set `EXPO_PUBLIC_AI_EXTERNAL_CALLS_ENABLED=1` only when external calls are approved.
4. Verify that no raw prompt, raw response, token, signed URL, email, phone, or address is logged.

Do not use service-role credentials in client or mobile code.

## Disable And Rollback

To disable immediately, unset or set either flag to `0`:

- `EXPO_PUBLIC_AI_DIRECTOR_PROPOSAL_RISK_SUMMARY`
- `EXPO_PUBLIC_AI_EXTERNAL_CALLS_ENABLED`

With the UI flag disabled, the component renders `null` and the existing director workflow is unchanged.

## Operator Checks

- Confirm the summary is labeled advisory.
- Confirm the director remains the final decision-maker.
- Confirm no approve/reject/pay/submit/receive action appears inside the AI component.
- Confirm invalid output fails closed.
- Confirm mutation intent fails closed.
- Confirm logs contain metadata only, never raw prompt or raw response content.
