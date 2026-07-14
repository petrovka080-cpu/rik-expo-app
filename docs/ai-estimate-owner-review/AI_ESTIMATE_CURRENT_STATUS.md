# AI Estimate Current Status

owner_go_no_go_status=PENDING_OWNER_REVIEW
owner_approved=false
production_release_started=false
contract_total_claimed=false
public_beta_started=false

## Technical Status

The current technical state is pilot-ready for owner review when the dependency audit,
business readiness contract, pilot operating model, KPI contract, owner PDF packet,
GO/NO-GO checklist, Web smoke, Android smoke, and source gates are green.
Foreman subcontract catalog/estimate actions are detail-card only; the subcontract
Estimate action remains bound to the shared AI-estimate draft mapping used by materials.

## Business Status

The business state remains pending owner review. The system must not present a contract
total and must not imply that production release or public beta has started.

## Daily Signals

- P0 defect count.
- P1 defect count.
- PDF generation success rate.
- Buyer handoff success rate.
- History reload success rate.
- Web and Android error count.
- Fake final total count.
- Raw dump UI count.
- Missing price visibility.
- Contract total claimed count.
