# 50K Background Jobs Boundary

## Current State

The app now has disabled-by-default BFF and cache/read-model contracts. The next 50K architecture step is to define which expensive or retry-sensitive work should move behind a server-side background job layer in a future server phase.

This wave is contract-only.

Production traffic migrated: NO  
Server deployed: NO  
Worker deployed: NO  
Background jobs enabled by default: NO  
Existing Supabase client flows replaced: NO  
50K readiness claimed: NO  
50K background job boundary scaffold: READY_DISABLED_BY_DEFAULT

## Why Background Jobs Matter

At 50K, synchronous client-driven execution becomes brittle for heavy work:

- PDF/report rendering can saturate client and backend request paths.
- Warehouse receive/apply and accountant payment flows need idempotent retry ownership.
- Cache/read-model refresh should be coalesced server-side instead of repeated by clients.
- Reconciliation and notification work should not block user interactions.

This wave does not build a queue, worker, cron, database table, or production endpoint.

## Contracted Job Queues

The contract module is `src/shared/scale/backgroundJobs.ts`.

Contracted queues:

- `proposal_submit_finalize_v1`
- `warehouse_receive_apply_v1`
- `accountant_payment_apply_v1`
- `director_report_build_v1`
- `pdf_report_render_v1`
- `cache_read_model_refresh_v1`
- `marketplace_catalog_reindex_v1`
- `realtime_channel_reconcile_v1`
- `notification_digest_v1`

All queues are `contract_only` in this wave.

## Enablement Rules

Background jobs are disabled unless all are true:

- `enabled === true`
- `shadowMode === true`
- a non-empty queue URL is configured

Even when those flags are present, this scaffold still reports `networkExecutionAllowed: false` and `workerExecutionAllowed: false`. Future server-side implementation must replace the contract-only plan with owner-approved staging shadow mode first.

## Payload Rules

Future job payloads must be small, idempotent, and redacted:

- max payload bytes: 16 KB
- max attempts: 5
- idempotency key required for production execution
- no raw user, company, request, proposal, invoice, phone, email, address, token, service credential, or signed URL values
- metadata allowlist only
- server-only credentials must never appear in client code

This scaffold records those rules but does not enqueue real jobs.

## Priority And Retry Rules

Default priorities:

- `high`: mutation-sensitive finalization and apply flows
- `normal`: report rendering and reconciliation flows
- `low`: cache refresh, catalog reindex, notification digest

Retries must be bounded. Future workers must treat non-retryable validation errors differently from transient network or infrastructure errors.

## Idempotency Rules

Production job execution must be idempotent. Future server implementation should derive idempotency from stable server-side identifiers and operation versions, not from raw client payloads.

For this wave, every contract marks:

- `idempotencyRequired: true`
- `payloadPiiAllowed: false`
- `ownerApprovalRequiredForProduction: true`

## Shadow Mode Plan

Future phases:

1. Keep this scaffold disabled in app runtime.
2. Build server queue endpoints in staging only.
3. Run shadow job planning without executing workers.
4. Prove idempotency, redaction, retry, and dead-letter handling.
5. Execute one non-user-visible staging job class.
6. Compare outputs against existing synchronous behavior.
7. Enable one production flow only after owner-approved release gates.
8. Roll back by disabling the job boundary flag and using current flows.

## What This Wave Does Not Do

This wave does not:

- deploy worker infrastructure
- create queue tables
- create cron jobs
- add Redis, queue, or worker dependencies
- change SQL, RPC, RLS, or storage policies
- route app traffic through background jobs
- replace existing Supabase reads or writes
- change mutation/payment/warehouse/report semantics
- publish OTA
- trigger EAS build, submit, or update
- claim 50K readiness
