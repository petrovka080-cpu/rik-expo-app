# 50K Cache Read Models

## Current State

The app now has a disabled-by-default BFF/server API boundary scaffold. The next 50K architecture step is to define which high-volume flows should use server-side cached read models in a future server phase.

This wave is contract-only.

Production traffic migrated: NO  
Server deployed: NO  
Cache read models enabled by default: NO  
Existing Supabase client flows replaced: NO  
50K readiness claimed: NO  
50K cache read model scaffold: READY_DISABLED_BY_DEFAULT

## Why Read Models Matter

At 50K, repeatedly assembling hot lists and dashboards from direct client queries creates excess database fan-out, repeated joins, duplicated aggregation, and unstable latency. Read models give the future server/BFF layer a controlled place to:

- pre-shape high-volume list responses
- cache safe dashboard/list summaries
- preserve max page size rules
- dedupe concurrent reads
- serve stale-while-revalidate where business semantics allow it
- isolate report/PDF artifact caching from active UI list caching

This wave does not build a server cache, Redis cache, database materialized view, or production endpoint.

## Contracted Read Models

The contract module is `src/shared/scale/cacheReadModels.ts`.

Contracted models:

- `request_list_v1` for `request.list`
- `proposal_list_v1` for `proposal.list`
- `buyer_request_list_v1` for `buyer.request.list`
- `proposal_detail_aggregate_v1` for `proposal.detail`
- `director_dashboard_v1` for `director.dashboard`
- `warehouse_ledger_v1` for `warehouse.ledger`
- `accountant_invoice_list_v1` for `accountant.invoice.list`
- `catalog_marketplace_list_v1` for `catalog.marketplace.list`
- `pdf_report_artifact_v1` for `pdf.report.request`

All models are `contract_only` in this wave.

## Enablement Rules

Read models are disabled unless all are true:

- `enabled === true`
- `shadowMode === true`
- a non-empty BFF base URL is configured

No active app flow imports or calls these read models. They are intended for a future staging shadow-mode migration.

## Pagination Rules

List-oriented read models inherit the BFF max page size:

- max page size: 100
- default page size remains owned by the caller/BFF contract
- pagination must stay explicit for list flows
- cache keys must not include raw user, company, request, proposal, invoice, phone, email, address, or signed URL values

## TTL And Freshness Policy

Conservative TTLs:

- 30 seconds for read-after-write-sensitive aggregates and warehouse ledger
- 60 seconds for hot lists and dashboards
- 120 seconds for marketplace/catalog lists
- 300 seconds maximum for versioned PDF/report artifacts

Future implementation must treat TTL as an upper bound, not a correctness guarantee. Invalidation events are part of each model contract.

## Invalidation Rules

Invalidation should be event-driven in the future BFF layer. Examples:

- `request.created`
- `request.updated`
- `proposal.submitted`
- `proposal.status_changed`
- `warehouse.receive_applied`
- `warehouse.issue_applied`
- `payment.applied`
- `listing.updated`
- `report.source_changed`

This wave only records invalidation names. It does not emit or consume events.

## Consistency Classes

Read model contracts use three consistency classes:

- `eventual`: safe for hot list/dashboard cache with short TTL
- `read_after_write_sensitive`: future server must prefer immediate refresh after mutation
- `artifact_versioned`: cache is safe only when source fingerprint/version matches

Warehouse ledger and proposal detail are intentionally more conservative than marketplace/catalog lists.

## Server-Only Safety

Future cache infrastructure credentials must remain server-only. Client code must not read Redis URLs, admin database credentials, worker secrets, or rate-limit secrets.

The scaffold does not read `process.env`, does not import server env helpers, and does not call a network API.

## Shadow Mode Plan

Future phases:

1. Keep contracts disabled in app runtime.
2. Build server read model endpoints in staging only.
3. Run shadow reads and compare BFF envelopes against current Supabase client results.
4. Prove pagination, redaction, and invalidation behavior.
5. Enable one read-only flow behind owner-approved feature flag.
6. Roll back by disabling the flag and returning to current Supabase client reads.

## What This Wave Does Not Do

This wave does not:

- deploy cache infrastructure
- create materialized views
- add Redis or cache dependencies
- change SQL, RPC, RLS, or storage policies
- route app traffic through cache
- replace existing Supabase reads
- publish OTA
- trigger EAS build, submit, or update
- claim 50K readiness

