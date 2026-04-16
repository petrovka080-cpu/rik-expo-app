# S2 Exec Summary

Status: GREEN

## Current Finding

S2 audit found a real role-truth drift class:

- UI route model merges membership, profile/RPC role, and signed metadata, but active role currently prefers `resolvedRole`.
- Buyer RFQ and attachment helpers were fixed during H1, but each owns a bespoke role priority.
- Director PDF auth still has signed metadata/RPC oriented access, while foreman/warehouse PDF auth already uses membership/resource policy.

## Implemented Safe Fix

Introduced one canonical server-side actor role resolver and aligned the proven high-risk helpers:

- `buyer_rfq_actor_is_buyer_v1`;
- `proposal_attachment_actor_role_v1`;
- office active-role derivation;
- director PDF role access helper / edge auth.

The canonical order is now explicit for critical paths:

1. `company_members.role`
2. `profiles.role`
3. signed `auth.jwt().app_metadata.role`
4. `public.get_my_role()`

Lower-priority sources no longer override explicit higher-priority database truth.

## Proof

- Targeted S2/security tests passed: 7 suites, 36 tests.
- Local attack-style verifier passed: 5 checks.
- Full typecheck passed.
- Expo lint passed with existing baseline warnings only.
- Full Jest passed: 272 passed suites, 1 skipped suite, 1543 passed tests, 1 skipped test.
- Production Supabase migration `20260416183000_s2_canonical_role_truth.sql` applied.
- Director PDF Edge functions redeployed with membership-first auth.
- Live RFQ verifier passed with `company_members/profile/app_metadata = buyer` and legacy `get_my_role() = contractor`; RFQ still published successfully through canonical buyer truth.

## What Is Not Changing

- no business role semantics;
- no contractor allow-list expansion;
- no proposal submit rewrite;
- no approve rewrite;
- no PDF template/render change;
- no global SQL refactor.
