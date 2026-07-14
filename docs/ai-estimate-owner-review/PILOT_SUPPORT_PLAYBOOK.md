# Pilot Support Playbook

owner_go_no_go_status=PENDING_OWNER_REVIEW
owner_approved=false
production_release_started=false
contract_total_claimed=false
public_beta_started=false

## Daily Review

Review the KPI dashboard every business day during pilot operation. Confirm that P0
defects are zero, P1 defects are reviewed, PDF/buyer success rates stay at or above
99 percent, and contract total claimed count stays zero.

## P0 Defect

Stop the pilot immediately, enable the kill switch if the AI estimate path can create
more exposure, preserve evidence, and notify the owner.

## P1 Defect

Keep the pilot on hold for the affected workflow until review is complete. Continue only
after the owner accepts the risk or the defect is fixed and verified.

## Support Packet

Support evidence must be redacted and must not include secrets, tokens, passwords,
private contacts, or raw provider payloads.
