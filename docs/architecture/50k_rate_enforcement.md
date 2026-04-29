# 50K Rate Enforcement Boundary

S-50K-RATE-ENFORCEMENT-1 adds a disabled-by-default server-side rate enforcement boundary. It prepares the platform to limit abusive read, mutation, job, realtime, and AI request storms later without changing current app behavior.

This wave does not enable live enforcement, does not block users, does not deploy Redis or edge storage, does not touch production or staging, and does not replace existing Supabase client flows.

## Boundary

- `NoopRateLimitAdapter`: disabled default, no external calls.
- `InMemoryRateLimitAdapter`: deterministic local/test proof only.
- `ExternalRateLimitAdapter`: contract marker only for future Redis/edge/server implementation.
- `abuseEnforcementBoundary`: observe-only decisions with redacted reason codes.

## Policy Table

Policies are defined in `src/shared/scale/rateLimitPolicies.ts` and all use `defaultEnabled: false`.

| Class | Count | Examples |
| --- | ---: | --- |
| Read | 8 | `request.proposal.list`, `marketplace.catalog.search`, `warehouse.issue.queue` |
| Mutation | 5 | `proposal.submit`, `warehouse.receive.apply`, `accountant.payment.apply` |
| Job | 3 | `notification.fanout`, `cache.readmodel.refresh`, `offline.replay.bridge` |
| Realtime | 2 | `realtime.channel.setup`, `realtime.subscription.refresh` |
| AI | 1 | `ai.workflow.action` |

## Key Safety

Rate-limit keys are deterministic and bounded. Raw PII and secret-bearing values are rejected before key construction. Actor, company, route, device, and idempotency identifiers are hashed into opaque key material.

Forbidden key inputs include email, phone, address, full name, raw access tokens, refresh tokens, server admin credentials, signed URLs, raw prompts, and raw AI responses.

## Idempotency Relationship

Mutation policies require idempotency metadata. The rate boundary is metadata-only in this wave and does not perform live enforcement. Future server enforcement should check idempotency before consuming mutation rate budget.

## Future External Store

A future Redis, edge, or server-side store can implement the external adapter contract. Missing external store credentials must keep the boundary disabled/noop.

## Rollback

Because this wave is disabled by default and not wired into app runtime, rollback is removing the server-side metadata wiring and rate boundary modules. No production data or schema rollback is required.
