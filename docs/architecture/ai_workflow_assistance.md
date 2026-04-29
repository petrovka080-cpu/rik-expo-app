# AI Workflow Assistance

## S-AI-WORKFLOW-2 Director Pilot

The first UI pilot is `director.proposal.risk_summary`.

Scope:

- Role: director.
- Surface: proposal detail sheet.
- UI: `DirectorProposalRiskSummaryCard`.
- Default state: hidden.
- AI behavior: advisory only.
- State mutation: not allowed.

The pilot is disabled unless `EXPO_PUBLIC_AI_DIRECTOR_PROPOSAL_RISK_SUMMARY=1`.
External AI execution is separately disabled unless `EXPO_PUBLIC_AI_EXTERNAL_CALLS_ENABLED=1`.
Missing flags mean disabled.

## Safety Contract

- The pilot does not auto-call AI on render.
- The director must press an explicit UI action to request a summary.
- The summary can suggest checks, but cannot approve, reject, submit, pay, receive, or mutate records.
- Invalid AI output fails closed.
- Mutation intent in AI output fails closed.
- Prompt inputs are sanitized before provider invocation.
- Raw prompts and raw AI responses must not be logged.
- Email, phone, token-like, signed URL, and obvious address data is redacted before prompt construction.

## Runtime Boundary

The mobile runtime does not wire a real external provider in this wave. Tests use mocked providers only.
Future provider wiring must preserve both gates:

- UI feature flag enabled.
- External AI calls explicitly enabled.

The existing director approval and rejection flows remain the source of truth and are not changed by this pilot.
