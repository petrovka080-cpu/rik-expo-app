# S2.1 Role / Ownership Truth Inventory

Status: ROOT GAPS FOUND

## Role Sources

| Surface | Source | Current priority / behavior | Risk |
| --- | --- | --- | --- |
| Office route model | `src/lib/appAccessModel.ts` | `availableOfficeRoles` includes company membership, `resolvedRole`, signed/auth metadata; `activeOfficeRole` currently prefers `resolvedRole`, then `authRole`, then membership-derived list. | UI can make one role look active while server critical RPC resolves a different canonical source. |
| Profile load | `src/screens/profile/profile.services.ts` | Reads signed `app_metadata.role`, user metadata fallback, `get_my_role()`, and `company_members`. | Multiple role truths are exposed to screens without one canonical conflict policy. |
| Session role | `src/lib/sessionRole.ts` | Uses signed metadata unless profile ensure is requested; then `get_my_role()`; no company membership check. | Good as session label helper, not safe as critical action truth. |
| Buyer RFQ RPC | `supabase/migrations/20260416165000_buyer_rfq_actor_role_priority_h1_7.sql` | `buyer_rfq_actor_is_buyer_v1()` checks `profiles.role`, then `company_members`, then signed app metadata, then `get_my_role()`. | It fixed H1.7 but priority is not the S2 canonical order; profile can beat membership. |
| Proposal attachment RPC | `supabase/migrations/20260416124500_attachment_role_priority_submit_conflict_recovery_h1_4.sql` | `proposal_attachment_actor_role_v1()` checks profile, then membership, then `get_my_role()`, then broad fallbacks. | Same priority drift; fallback helper can still be reached by critical attach/read helpers. |
| Proposal attachment owner continuation | `supabase/migrations/20260416144500_attachment_owner_continuation_recovery_h1_5.sql` | Attach allows buyer/accountant or the authenticated creator of the existing proposal. | Safe H1.5 continuation, but role helper below it is still not a single canonical contract. |
| Director PDF auth | `src/lib/pdf/directorPdfAuth.ts` and director PDF edge functions | `director-pdf-render` has signed app metadata fast-path before `get_my_role()`; report PDF functions use signed app metadata plus RPC. | PDF/storage access can authorize from a different source than office membership. |
| Foreman / warehouse PDF auth | `src/lib/pdf/rolePdfAuth.ts` and `supabase/functions/foreman-request-pdf`, `warehouse-pdf` | Uses company membership and owner/same-company policy for generated PDF access. | Stronger than director PDF auth; should define the S2 storage policy baseline. |

## Critical Action Owners

| Action | Client entry | Server owner | Role / ownership guard today |
| --- | --- | --- | --- |
| Buyer RFQ publish | `src/screens/buyer/buyer.rfq.mutation.ts` | `buyer_rfq_create_and_publish_v1` | Buyer-only check via `buyer_rfq_actor_is_buyer_v1()` plus visible item scope via `list_buyer_inbox(null)`. |
| Proposal submit | `src/lib/catalog/catalog.proposalCreation.service.ts`, `src/screens/buyer/buyer.submit.mutation.ts` | `rpc_proposal_submit_v3` + H1.4b replay wrapper | Auth required via `auth.uid()`; resource scope checked through request items and idempotency ledger. No role helper normalization in S2 terms. |
| Director approve | `src/screens/director/director.approve.boundary.ts` | `director_approve_pipeline_v1` | H1.6 wrapper casts proposal id and calls backend approve/purchase/accountant functions; role/ownership depends on underlying approve functions. |
| Proposal attachments | `src/lib/api/proposalAttachmentEvidence.api.ts`, `proposalAttachments.service.ts` | `proposal_attachment_evidence_attach_v1` / `proposal_attachment_evidence_scope_v1` | Buyer/accountant or proposal creator can bind; visibility read check uses viewer role and visibility scope. |
| Director/role PDFs | PDF edge functions | Edge function + PDF source RPC + storage signed URL | Mixed: foreman/warehouse use membership/same-company; director report family still relies on signed metadata/RPC role. |

## Cleanup / Alignment Need

S2 should not add roles to allow-lists. It should add a canonical role resolution boundary and move critical helpers to it:

1. `company_members` allowed role for the authenticated user.
2. `profiles.role` only when no membership truth decides the role.
3. signed `auth.jwt().app_metadata.role` only when no stronger DB truth exists.
4. `get_my_role()` only as last compatibility fallback.

If a higher-priority DB truth exists and does not match the requested critical role, lower-priority fallback must not silently override it.
