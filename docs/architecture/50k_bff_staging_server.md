# 50K BFF Staging Server Boundary

Status: deploy-ready server boundary, production-safe, disabled for app runtime by default.

This boundary is the first staging-deployable BFF layer for the existing 50K BFF contracts. It does not replace mobile Supabase flows, does not migrate production traffic, and does not execute live mutations unless a future staging deployment explicitly enables mutation routing with idempotency and rate-limit metadata.

## Boundary

Server entrypoint contract:

- `scripts/server/stagingBffServerBoundary.ts`

Endpoint contracts:

- `GET /health`
- `GET /ready`
- `POST /api/staging-bff/read/request-proposal-list`
- `POST /api/staging-bff/read/marketplace-catalog-search`
- `POST /api/staging-bff/read/warehouse-ledger-list`
- `POST /api/staging-bff/read/accountant-invoice-list`
- `POST /api/staging-bff/read/director-pending-list`
- `POST /api/staging-bff/mutation/proposal-submit`
- `POST /api/staging-bff/mutation/warehouse-receive-apply`
- `POST /api/staging-bff/mutation/accountant-payment-apply`
- `POST /api/staging-bff/mutation/director-approval-apply`
- `POST /api/staging-bff/mutation/request-item-update`

## Safety Defaults

- Read routes are registry-ready and require injected read ports.
- Mutation routes are disabled by default.
- Mutation routes require explicit staging enablement, idempotency metadata, and rate-limit metadata.
- Request envelopes are validated before handler invocation.
- Handler responses are validated before being returned.
- Errors are redacted through the existing BFF safety boundary.
- The boundary does not log raw payloads.
- The app runtime BFF flag remains disabled by default.

## Server-Only Environment Names

These names are documented for deployment planning only. Values must never be printed or committed.

- `STAGING_BFF_BASE_URL`
- `BFF_SERVER_AUTH_SECRET`
- `BFF_DATABASE_READONLY_URL`
- `BFF_MUTATION_ENABLED`
- `BFF_IDEMPOTENCY_METADATA_ENABLED`
- `BFF_RATE_LIMIT_METADATA_ENABLED`

## 50K Impact

This is not a 50K readiness claim. It creates the staging server boundary needed before real 50K work can move traffic behind server routing, cache/read models, background jobs, idempotency storage, and rate enforcement.

Next server work should deploy the boundary to staging, provide `STAGING_BFF_BASE_URL`, and run staging shadow parity without migrating app traffic.
