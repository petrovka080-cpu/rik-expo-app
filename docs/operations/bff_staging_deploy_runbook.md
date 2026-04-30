# BFF Staging Deploy Runbook

Status: repo-ready disabled. External staging target provisioning and `STAGING_BFF_BASE_URL` are required before BFF can be marked staging-live or before staging shadow traffic can run.

## Purpose

Deploy the staging BFF boundary without changing production, mobile runtime defaults, SQL/RPC/RLS/storage, or package/native config.

## Required Inputs

Provide these through the staging server environment only:

- `STAGING_BFF_BASE_URL`
- `BFF_SERVER_AUTH_SECRET`
- `BFF_DATABASE_READONLY_URL`
- `BFF_MUTATION_ENABLED`
- `BFF_IDEMPOTENCY_METADATA_ENABLED`
- `BFF_RATE_LIMIT_METADATA_ENABLED`

Do not place these values in client/mobile code, app config, artifacts, logs, screenshots, or commits.

## Safe Deployment Shape

1. Deploy `scripts/server/stagingBffServerBoundary.ts` behind a staging-only server wrapper.
2. Keep app runtime BFF usage disabled.
3. Keep production traffic on existing flows.
4. Verify `GET /health`.
5. Verify `GET /ready`.
6. Run read route shadow checks first.
7. Enable mutation routes only for seeded staging fixtures with cleanup proof.
8. Keep mutation route enablement off by default after verification.

## Rollback

Rollback is server-side only:

- remove the staging BFF route target
- unset `STAGING_BFF_BASE_URL`
- keep app runtime BFF disabled
- leave existing Supabase client flows untouched

## Forbidden During This Wave

- production traffic migration
- production reads or writes
- staging writes without seeded cleanup proof
- SQL/RPC/RLS/storage changes
- package/native config changes
- Play Market, OTA, EAS build, EAS submit, or EAS update
- raw payload or secret logging
