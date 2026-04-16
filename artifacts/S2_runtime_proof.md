# S2 Runtime Proof

Status: GREEN

Verifiers:

- `npx tsx scripts/s2_security_runtime_verify.ts`
- `npx tsx scripts/buyer_tender_publish_runtime_verify.ts`

## Local Attack-Style Results

- S2-A-001: passed - buyer publish under conflicting role sources
- S2-A-002: passed - foreign company resource access denial
- S2-A-003: passed - signed URL issuance denial for unauthorized actor
- S2-A-004: passed - same-company allowed PDF/doc access
- S2-A-005: passed - director PDF role source parity

## Live Runtime Result

The live RFQ verifier passed after production migration apply.

- Legacy helper value: `get_my_role() = contractor`
- Canonical sources present: `company_members.role = buyer`, `profiles.role = buyer`, signed `app_metadata.role = buyer`
- Result: `buyer_rfq_create_and_publish_v1` published RFQ successfully through canonical buyer truth
- Forbidden actor role regression: absent

## Deployment Proof

- Supabase migration `20260416183000_s2_canonical_role_truth.sql` applied.
- Director PDF Edge functions redeployed:
  - `director-pdf-render`
  - `director-production-report-pdf`
  - `director-subcontract-report-pdf`
  - `director-finance-supplier-summary-pdf`
