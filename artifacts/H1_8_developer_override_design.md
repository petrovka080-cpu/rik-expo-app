# H1.8 Developer Break-Glass Override Design

Status: IN PROGRESS

## Model

H1.8 adds a server-owned break-glass layer for one known developer account:

- target user: `<redacted-email>`
- target user id: `9adc5ab1-31fa-41be-8a00-17eadbb37c39`
- storage: `public.developer_access_overrides`
- audit: `public.developer_override_audit_log`

The base identity remains unchanged. The developer account keeps its normal profile, membership, and app metadata. The override only activates when `active_effective_role` is selected, the row is enabled, the role is allowed, and `expires_at` is still valid.

## Effective Role

The effective role is selected through `developer_set_effective_role_v1(...)`, not by trusting client state. The server validates:

- `auth.uid()` exists;
- a matching override row exists for that exact user;
- `is_enabled = true`;
- the override is not expired;
- the requested role is in `allowed_roles`.

Clearing the selected role through `developer_clear_effective_role_v1()` returns the account to normal role behavior.

## Safety

This is safer than adding broad allow-list roles because ordinary users do not gain permissions. Critical paths that use `app_actor_role_context_v1(...)` see `source = developer_override` only after server validation. All selections, denials, expiration events, and override RPC role actions are logged.
