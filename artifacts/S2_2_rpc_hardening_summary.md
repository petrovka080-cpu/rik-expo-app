# S2.2 RPC Hardening Summary

Status: COMPLETE

## Implemented Hardening Scope

The narrow hardening target was a shared canonical actor-role resolver plus critical helper alignment:

- added `app_actor_role_context_v1(...)` as a schema-qualified security-definer helper with empty search path;
- updated `buyer_rfq_actor_is_buyer_v1()` to use the canonical helper;
- updated `proposal_attachment_actor_role_v1(...)` to use the canonical helper;
- keep RFQ buyer-only business semantics unchanged;
- keep attachment buyer/accountant/proposal-owner continuation unchanged;
- keep proposal submit/approve business flow unchanged.

## Guard Contract

- Auth source is `auth.uid()`, not client payload.
- Role source is canonical membership-first truth.
- Stronger sources deny lower-source override when present.
- RFQ publish remains buyer-only.
- Attachment role helper remains constrained to buyer/director/accountant role semantics and existing proposal-owner continuation.
- All added SQL uses schema-qualified references and `set search_path = ''`.

## Production Proof

- Migration `20260416183000_s2_canonical_role_truth.sql` was applied to the linked Supabase project.
- `buyer_tender_publish_runtime_verify.ts` passed against the live backend with conflicting role sources.
- The proof case had legacy `get_my_role() = contractor`, while canonical buyer truth existed in membership/profile/app metadata, and RFQ publish succeeded without adding contractor to the buyer allow-list.

## Not In This Patch

- no rewrite of `rpc_proposal_submit_v3`;
- no rewrite of `director_approve_pipeline_v1`;
- no global migration of every `security definer` function;
- no access broadening for contractor or other roles.
