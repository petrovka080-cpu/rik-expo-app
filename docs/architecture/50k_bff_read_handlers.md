# 50K BFF Read Handlers

Owner goal: 50K+ readiness.

This wave does not deploy a server.
This wave does not migrate production traffic.
This wave does not replace existing Supabase client flows.
This wave creates disabled, testable read-only BFF handlers only.

## Current Scaffold State

The BFF/server boundary, cache read-model contracts, background job contracts, idempotency/retry/dead-letter contracts, and rate-limit/abuse-guard contracts already exist under `src/shared/scale`.

Those contracts are disabled by default. They do not move app traffic, do not read production environment values, and do not deploy infrastructure.

## Why This Comes Next

At 50K+ scale, broad direct client reads become a shared database fan-out risk. Contract-only scaffolds define the target shape, but future migration needs executable server-side handler functions that can be tested before any staging or production traffic is routed through them.

S-50K-BFF-READ-1 adds that first executable layer for read paths only. The handlers call dependency-injected ports, not Supabase. Tests use mocked ports only.

## Target Read Flows

- `request.proposal.list`
- `marketplace.catalog.search`
- `warehouse.ledger.list`
- `accountant.invoice.list`
- `director.pending.list`

These map to the existing high fan-out BFF/cache contracts for proposal/request lists, marketplace catalog reads, warehouse ledger reads, accountant invoice reads, and director dashboard/pending reads.

## Handler And Port Architecture

Handlers live in `src/shared/scale/bffReadHandlers.ts`.

Ports live in `src/shared/scale/bffReadPorts.ts`.

The handler layer owns request normalization, pagination, safe filter shaping, response envelopes, cache metadata, and rate-limit metadata. The future server adapter will own real data access by implementing the ports. Current app screens do not import these handlers.

## Pagination Requirements

Every handler normalizes `page` and `pageSize` through the existing BFF page helper.

- Negative page numbers become `0`.
- Page size is clamped to `100`.
- Returned envelopes include the normalized page window.

## Cache Read-Model Integration

Handlers attach read-model metadata from `CACHE_READ_MODEL_CONTRACTS` when a mapped flow exists. This identifies cache candidates and model names without enabling cache infrastructure.

No cache service is deployed by this wave.

## Rate Limit Metadata

Handlers attach `read_heavy` bucket metadata and, where an existing disabled rate policy exists, the matching operation name. Enforcement remains disabled and no users are blocked.

No rate-limit storage or live enforcement is created by this wave.

## Error And Redaction Policy

Handler errors are generic and do not expose raw port exceptions. Search strings and string filters are redacted and bounded before they are passed to ports.

Handlers must not return or log tokens, signed URLs, emails, phone numbers, addresses, company names, raw payment payloads, raw SQL/RPC parameters, or credentials.

## Why Not Wired Yet

The handlers are disabled by architecture. They are not imported by active app runtime flows and do not replace current Supabase client calls. This keeps the wave production-safe while making the future BFF server path executable in tests.

## Future Staging Shadow-Mode Plan

When staging access exists, a server adapter can implement the ports with staging-only credentials and run handlers in shadow mode. Shadow mode should compare response shape, pagination windows, redaction, cache metadata, and latency against existing client flows without changing user-visible behavior.

## Future Production Migration Plan

Production migration should happen only after staging shadow proof, cache/read-model proof, rate-limit shadow proof, and rollback proof. Traffic should move one handler at a time behind a feature flag with observability and immediate rollback.

## What This Wave Does Not Do

- It does not deploy server infrastructure.
- It does not create API routes.
- It does not create Edge Functions.
- It does not touch production.
- It does not migrate production traffic.
- It does not replace existing Supabase client flows.
- It does not change SQL, RPC, RLS, or storage policies.
- It does not publish OTA or trigger EAS.
- It does not claim 50K readiness.
