# AI Estimate Limited Public Beta Plan

Status: plan only. Public beta remains disabled by default.

## Gates

- Public beta flag: disabled by default.
- Maximum public beta cohort: 0.5 percent.
- Country and city allowlist: required before any external exposure.
- Kill switch: required and must override all beta flags.
- Rollback: required and must preserve manual request creation and catalog picker flows.
- Daily evaluation: required for latency, PDF, weak row, wrong work, feedback, and safety metrics.
- Manual monitoring: required for every beta day.
- Regulated high-risk work: excluded from public beta by default unless explicitly approved in a later wave.

## Decision

The canary evaluation wave may produce `GO_LIMITED_PUBLIC_BETA`, but it does not enable the beta. Execution requires a separate limited public beta execution wave with live monitoring and rollback ownership.
