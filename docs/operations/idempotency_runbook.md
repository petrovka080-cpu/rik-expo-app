# Idempotency Boundary Runbook

S-50K-IDEMPOTENCY-INTEGRATION-1 is a contract-only operational boundary. It prepares BFF and job routes for future idempotency persistence without enabling live enforcement.

## Current State

- Production touched: no.
- Staging touched: no.
- App runtime idempotency persistence: disabled.
- Existing app flows: unchanged.
- SQL/RPC/RLS/storage: unchanged.
- Package/native config: unchanged.

## Before Enabling In A Future Wave

1. Pick a storage backend: DB table, Redis, queue-provider dedupe, or another external store.
2. Add storage in a separate owner-approved wave.
3. Prove `reserve`, `commit`, `fail`, `getStatus`, `releaseExpired`, and `getHealth`.
4. Run seeded staging-only mutation tests with cleanup proof.
5. Keep production disabled until staging duplicate/retry behavior is proven.

## Required Metadata

Every mutating operation must provide:

- actor id
- request id
- payload hash

Offline replay must also provide:

- replay mutation id
- operation type

## Key Safety

Never put raw PII or secrets in idempotency keys. Forbidden inputs include:

- email
- phone
- address
- full name
- raw access tokens
- refresh tokens
- service/admin keys
- signed URLs
- raw prompts
- raw AI responses

## Failure Handling

- Retryable failure: record `failed_retryable`; the next attempt may reserve again when the policy allows retry.
- Final failure: record `failed_final`; repeated execution is blocked.
- Committed success: record `committed`; duplicate calls return a safe duplicate status.
- In-flight duplicate: return `duplicate_in_flight` and do not execute the handler.

## Observability

Only record safe status signals:

- operation name
- duplicate state
- key status as `present_redacted` or `missing`
- result state

Do not log raw payloads, full keys, user data, tokens, or signed URLs.

## Disable Strategy

Keep using `NoopIdempotencyAdapter` or set the future adapter flag to disabled. With enforcement disabled, handlers pass through unchanged and no persistence is used.
