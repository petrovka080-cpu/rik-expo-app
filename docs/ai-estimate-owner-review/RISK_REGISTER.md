# Risk Register

owner_go_no_go_status=PENDING_OWNER_REVIEW
owner_approved=false
production_release_started=false
contract_total_claimed=false
public_beta_started=false

| Risk | Severity | Control |
| --- | --- | --- |
| Contract total implied before approval | P0 | Contract total claimed count must be zero. |
| Missing price hidden from owner | P0 | Missing price visibility is required in docs and PDF. |
| Raw dump appears in UI | P0 | Raw dump UI count must be zero. |
| Android-only failure | P1 | Android owner-review smoke must stay green. |
| History reload regression | P1 | History reload success rate must be at least 99 percent. |
| Buyer handoff drift | P1 | Buyer handoff success rate must be at least 99 percent. |
| High-risk work escapes scope | P0 | Blocked work family list and P0 auto-stop. |

P0 defects stop the pilot. P1 defects require review before continuation.
