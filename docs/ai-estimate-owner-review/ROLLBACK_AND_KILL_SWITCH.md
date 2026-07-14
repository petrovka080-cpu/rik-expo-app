# Rollback And Kill Switch

owner_go_no_go_status=PENDING_OWNER_REVIEW
owner_approved=false
production_release_started=false
contract_total_claimed=false
public_beta_started=false

## Kill Switch

Use `AI_ESTIMATE_DISABLE_ALL=1` to stop new AI estimate generation. Keep existing
approved snapshots readable so support can resolve active cases.

## Partial Switches

- Disable PDF generation if PDF output is unsafe.
- Disable buyer handoff if procurement packaging is unsafe.
- Disable complex engineering work if high-risk prompts escape pilot scope.

## Rollback

Rollback is an operating action for the pilot only. It does not start native build,
EAS, production release, public beta, or production DB migration.

## Evidence

Record the time, reason, owner notification, affected cohort, and recovery decision for
every kill switch or rollback action.
