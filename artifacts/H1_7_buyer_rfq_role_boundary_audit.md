# H1.7 Buyer RFQ Role Boundary Audit

## STATUS

ROOT CAUSE FOUND.

## Runtime Symptom

The buyer "Торги" action reached `buyer_rfq_create_and_publish_v1`, but the RPC rejected it with:

```text
code: 42501
message: buyer_rfq_create_and_publish_v1: forbidden actor role
```

This proves the UI button and client RPC call path were live. The failure was the server-side actor role boundary.

## Exact Boundary Chain

```text
/office/buyer RFQ button
-> useBuyerRfqPublish / publishRfqAction
-> publishRfq
-> supabase.rpc("buyer_rfq_create_and_publish_v1", payload)
-> buyer_rfq_create_and_publish_v1 actor guard
-> public.get_my_role()
-> public.get_my_role_base() + user_profiles.is_contractor compatibility override
-> 42501 forbidden actor role
```

## Root Cause

`buyer_rfq_create_and_publish_v1` previously accepted only:

- `public.get_my_role() = 'buyer'`
- or `company_members.role = 'buyer'`

Production `get_my_role()` can return `contractor` when `user_profiles.is_contractor = true`, even when canonical buyer sources still identify the user as a valid buyer. The `/office/buyer` access model can also use trusted role sources outside that narrow RPC guard, so the client could correctly enter the buyer screen while the RFQ RPC rejected the same user.

## Exact Stale / Mismatched Owner

| Surface | Owner | Source fields | Failure |
| --- | --- | --- | --- |
| Buyer route access | client app access model | auth/app role + office role model | Allowed `/office/buyer` |
| RFQ publish RPC | `buyer_rfq_create_and_publish_v1` | `get_my_role()` first, membership fallback only | Rejected valid buyer if `get_my_role()` returned `contractor` |
| Diagnostic role | `get_my_role()` | `user_profiles.is_contractor` compatibility override | Reported `contractor` |
| Canonical buyer truth | server role records | `profiles.role`, `company_members.role`, trusted `app_metadata.role` | Not fully consulted by RFQ guard |

## Minimal Safe Fix Scope

Add a server-side buyer-only helper that checks canonical buyer sources before the compatibility `get_my_role()` fallback:

1. `profiles.role = 'buyer'`
2. `company_members.role = 'buyer'`
3. trusted `auth.jwt().app_metadata.role = 'buyer'`
4. fallback `get_my_role() = 'buyer'`

The business permission remains buyer-only. No director/accountant/contractor allow-list was added to RFQ publishing.

## Proof

Remote migration `20260416165000_buyer_rfq_actor_role_priority_h1_7.sql` was applied. Remote function definition now shows:

```text
v_actor_is_buyer boolean := public.buyer_rfq_actor_is_buyer_v1();
if not v_actor_is_buyer then raise 42501 forbidden actor role;
```

Runtime verifier created a temporary buyer whose `get_my_role()` returned `contractor`, while canonical buyer sources remained present. RFQ publish succeeded and created a published tender.
