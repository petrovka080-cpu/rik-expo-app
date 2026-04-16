# H1.8 Route / RPC Alignment

Status: IN PROGRESS

## Route Gating

Office route access reads `developer_override_context_v1()` during Office bootstrap. If the target developer override is enabled and `can_access_all_office_routes = true`, the Office access model includes the allowed override roles in `availableOfficeRoles`.

The role switcher is rendered only when the server reports an enabled override row for the current `auth.uid()`.

## RPC Gating

`app_actor_role_context_v1(...)` now checks server-side override context before normal S2 role truth. Override mode applies only when:

- `developer_override_context_v1().isActive = true`;
- `canImpersonateForMutations = true`;
- selected effective role is present;
- selected role is one of the roles allowed for that RPC/action.

If a selected effective role does not match the action, the resolver returns `allowed=false` with `reason=effective_role_not_allowed_for_action` instead of silently falling back to the base user role.

## PDF Access

Director PDF edge auth passes active developer override context into `resolveDirectorPdfRoleAccess(...)`, so selecting `director` allows developer verification of director PDF paths without granting director access to ordinary users.
