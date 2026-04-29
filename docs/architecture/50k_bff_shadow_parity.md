# 50K BFF Shadow Parity

This wave does not deploy a server.
This wave does not use production or staging data.
This wave does not migrate production traffic.
This wave does not replace existing Supabase client flows.
This wave creates local fixture-based BFF shadow/parity proof only.

## Current State

The 50K scaffold path now has contract-only BFF boundaries, cache/read-model contracts, background job contracts, idempotency/retry/dead-letter contracts, rate-limit metadata, disabled read handlers, and disabled mutation handlers.

The handlers are still not live. They are not imported by current screens, app routes, or active client data paths.

## Why Local Shadow Comes First

Local shadow parity gives a safe bridge between disabled handler contracts and a future staging shadow run. It proves that the future BFF path can be exercised with deterministic fixture ports, stable envelopes, pagination expectations, idempotency checks, rate metadata, and retry/dead-letter metadata before any server or traffic migration exists.

## Covered Flows

Read flows:

- `request.proposal.list`
- `marketplace.catalog.search`
- `warehouse.ledger.list`
- `accountant.invoice.list`
- `director.pending.list`

Mutation flows:

- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `director.approval.apply`
- `request.item.update`

## Fixture Strategy

Fixtures live in `src/shared/scale/bffShadowFixtures.ts`. They use deterministic fake IDs such as `test-request-001`, `test-proposal-001`, `test-invoice-001`, and `test-warehouse-ledger-001`. Ports record only safe call metadata such as page, page size, query length, idempotency presence, and payload presence.

No fixture port reads live configuration, connects to Supabase, calls network, or mutates real state.

## Compared Fields

The harness compares safe contract fields only:

- success/error envelope shape
- read pagination page, pageSize, from, and to
- read array data shape
- read metadata for cache candidate, rate bucket, and disabled runtime wiring
- mutation idempotency requirement
- mutation rate-limit metadata
- mutation retry/dead-letter metadata
- disabled runtime and no-direct-Supabase markers

## Ignored Fields

The harness intentionally ignores:

- generated timestamps
- server timing details
- cache hit values
- trace IDs
- private IDs
- raw payload bodies
- user, company, amount, address, phone, token, and signed URL details

## Redaction Rules

Mismatch reasons are redacted through the existing BFF safety helper. Shadow results never include raw fixture payloads, raw search strings, signed URLs, tokens, phone numbers, emails, or company details. The test suite verifies that PII-like fixture values are not present in shadow output.

## Running Local Shadow Tests

Run:

```bash
npm test -- --runInBand bffShadowParity
npm test -- --runInBand shadow
npm test -- --runInBand parity
```

The broader gate also includes the existing BFF, scale, read, mutation, idempotency, and rate suites.

## Future Staging Shadow Plan

A future staging-only wave can replay the same handler contracts against an isolated staging shadow source if the owner explicitly provides staging access. That wave should compare redacted shape and metadata only, keep traffic off the active app path, and require a separate proof artifact.

## Future Production Migration Plan

Production migration should happen only after staging shadow parity, observability, rate-limit behavior, cache/read-model behavior, and rollback discipline are proven. The migration should be incremental by flow and remain reversible.

## Out Of Scope

This wave does not create API routes, Edge Functions, server deployments, workers, cache infrastructure, production reads, staging reads, production writes, staging writes, client route changes, package changes, native config changes, OTA publish, EAS build, EAS submit, or Android/Play Market work.
