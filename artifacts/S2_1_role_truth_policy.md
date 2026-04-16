# S2.1 Canonical Role Truth Policy

Status: DEFINED

## Canonical Order

For critical actions, role truth is resolved server-side for `auth.uid()` only:

1. `company_members.role`
2. `profiles.role`
3. signed `auth.jwt().app_metadata.role`
4. `public.get_my_role()`

Client-provided role, company id, user id, or screen route are not role truth.

## Positive / Negative Semantics

When an action asks for allowed roles, the resolver must:

- return allowed when the first applicable source contains one of the requested roles;
- stop at the first applicable stronger source even when that source denies the requested role;
- use lower-priority sources only when the stronger source is absent;
- expose `role`, `source`, and `allowed` for diagnostics.

This prevents stale signed metadata or legacy helper output from overriding explicit company membership.

## Where Fallback Is Acceptable

Fallbacks are acceptable only for compatibility when no higher-priority role truth exists:

- a legacy user with `profiles.role = buyer` and no membership may still publish buyer RFQ;
- a legacy user with signed `app_metadata.role = buyer` and no DB role truth may still publish buyer RFQ;
- `get_my_role()` may help old sessions only after membership/profile/signed metadata are absent.

Fallbacks are not acceptable when they contradict explicit `company_members` truth.

## Route / RPC Rule

Office route access may render available role cards from multiple sources, but the active route role must prefer the same order as the server. If route truth and RPC truth differ, the mutation must fail with typed/observable forbidden instead of a deep generic failure.
