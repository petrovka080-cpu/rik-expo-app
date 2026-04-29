# 50K BFF Mutation Handlers

## Current Scaffold State

The BFF/server boundary, read-only BFF handlers, cache/read-model contracts, background job contracts, idempotency/retry/dead-letter contracts, and rate-limit/abuse-guard contracts already exist under `src/shared/scale`.

This wave moves the mutation boundary from contract-only planning toward disabled, testable handler modules. It still does not route app traffic through a server.

## Why Mutation Handlers Are Next

Read handlers cover high-volume fan-out reads. The next 10K/50K risk is high-value mutation traffic that currently needs a future server-side boundary for idempotency, rate limiting, retry policy, dead-letter handling, validation, and safe response envelopes.

## Target Mutation Flows

- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `director.approval.apply`
- `request.item.update`

## Handler And Port Architecture

Handlers live in `src/shared/scale/bffMutationHandlers.ts`.

Ports live in `src/shared/scale/bffMutationPorts.ts`.

Handlers call dependency-injected ports only. They do not import Supabase clients, do not create API routes, and do not execute real mutations. This keeps the modules executable in tests while staying disconnected from active app runtime.

## Idempotency Requirements

Every handler requires an opaque idempotency key before calling a port. Missing or unsafe keys fail closed with a generic response:

`Request cannot be processed safely`

The handler metadata references existing idempotency contracts from `src/shared/scale/idempotency.ts`.

## Rate Limit Metadata

Each handler attaches disabled rate-limit metadata from `src/shared/scale/rateLimits.ts`.

Mutation-sensitive handlers use `write_sensitive`; accountant payment uses `external_side_effect`.

## Retry And Dead-Letter Metadata

Each handler attaches retry metadata from `src/shared/scale/retryPolicy.ts` and dead-letter metadata that records exhaustion intent without storing raw payload or PII.

## Error And Redaction Policy

Handlers return generic errors and ignore raw thrown errors. Success output is sanitized before it enters the BFF response envelope. Payloads are passed only to injected ports and are never returned or logged by handlers.

## Why Handlers Are Not Wired Yet

The app still uses existing client flows. These handlers are future server/BFF entry points. Wiring them into UI without staging shadow-mode proof would change production behavior and is outside this wave.

## Future Staging Shadow-Mode Plan

After staging access exists, a shadow-mode wave can run equivalent mutation requests against mocked or staging-only server adapters, compare envelopes, validate idempotency behavior, and prove no duplicate mutation risk before any user traffic moves.

## Future Production Migration Plan

Production migration should happen only after staging shadow proof, owner approval, server deployment, observability, rollback, idempotency-store proof, and rate-limit shadow metrics exist. Client mutation flows can then move one operation at a time.

## What This Wave Does NOT Do

This wave does not deploy a server.
This wave does not migrate production traffic.
This wave does not replace existing Supabase client flows.
This wave does not execute real mutations.
This wave creates disabled, testable mutation BFF handlers only.

It also does not change SQL, RPC, RLS, storage policies, package config, native config, OTA state, EAS state, or Play Market / Android submit state.
