# 50K Server API Boundary

## 1. Current state

The app still uses direct client Supabase access for many reads, writes, realtime subscriptions, and report/PDF flows. Recent waves added pagination, runtime validation, realtime budgeting, tracing, rollback safety, and targeted strict checks, but the runtime data path is still mostly client to Supabase.

This wave adds contracts and a disabled-by-default client scaffold only.

Production traffic migrated: NO  
Server deployed: NO  
BFF enabled by default: NO  
50K readiness claimed: NO  
50K architecture boundary scaffold: READY_DISABLED_BY_DEFAULT

## 2. 10K-safe client-side assumptions

The current client-side model can remain reasonable for 10K only when these assumptions hold:

- high-volume list reads are paginated and ordered
- database indexes and query plans remain verified
- realtime subscriptions stay inside channel budgets
- reports/PDF generation is guarded and observable
- top flows have performance tracing available after approved release enablement
- production and staging checks are run with owner-provided access

Those assumptions do not remove the need for a server boundary at 50K.

## 3. Why 50K needs BFF/server layer

At 50K, direct clients multiply read fan-out, realtime subscriptions, retry traffic, and aggregation work. A server/BFF layer provides a place for:

- cached read models for hot lists and dashboards
- server-side joins and aggregation
- rate limits and abuse controls
- background jobs for expensive report/PDF work
- mutation validation and idempotency controls
- low-cardinality observability around high-risk flows
- strict separation between client credentials and server-only credentials

This scaffold does not claim that capacity is ready. It creates the boundary needed for future migration.

## 4. Top fan-out flows

Initial BFF candidates:

- request/proposal list loads
- buyer request list and request item fan-in
- proposal detail aggregation
- director pending approvals and dashboard reads
- warehouse ledger and stock movement summaries
- warehouse receive/apply mutation flow
- accountant invoice and payment views
- marketplace/catalog list reads
- PDF/report generation requests
- realtime channel lifecycle reporting

Existing Supabase flows remain active. This wave maps future contracts only.

## 5. Proposed BFF contracts

Contract examples are intentionally endpoint names only, not live URLs:

- `GET /api/v1/requests`
- `GET /api/v1/proposals`
- `GET /api/v1/proposals/:proposalId`
- `POST /api/v1/proposals`
- `GET /api/v1/buyer/requests`
- `GET /api/v1/warehouse/ledger`
- `POST /api/v1/warehouse/receive`
- `GET /api/v1/accountant/invoices`
- `POST /api/v1/accountant/payments`
- `GET /api/v1/director/dashboard`
- `GET /api/v1/marketplace/listings`
- `POST /api/v1/reports/pdf`
- `POST /api/v1/realtime/channel-lifecycle`

The contract module is `src/shared/scale/bffContracts.ts`. The adapter in `src/shared/scale/bffClient.ts` is contract-only and fail-closed.

## 6. Server-only secret rules

Server-only credentials must never be exposed to the app bundle, Expo public env, logs, artifacts, or screenshots.

Future server-only variables may include names such as `BFF_SUPABASE_ADMIN_KEY`, `BFF_SUPABASE_URL`, `BFF_REDIS_URL`, and `BFF_RATE_LIMIT_SECRET`. These names are documentation placeholders. The client scaffold must not read them.

Rules:

- keep admin database credentials on the server only
- never place privileged credentials in `EXPO_PUBLIC_*`
- never import server env helpers into app code
- never log Authorization headers, JWTs, signed URLs, or raw payloads
- redact errors before returning them to clients
- use least-privilege runtime credentials per server job

## 7. Pagination and response envelope rules

All list contracts require pagination. The scaffold uses:

- default page size: 50
- max page size: 100
- zero-based page index
- computed `from` and `to` boundaries

All BFF responses must use an envelope:

- success: `{ ok: true, data, page?, serverTiming? }`
- error: `{ ok: false, error: { code, message } }`

Errors must be generic and redacted. Raw DB errors and payloads must not be returned.

## 8. Rate limiting and abuse controls

Future BFF implementation should rate-limit by category:

- `read_heavy`: request/proposal lists, dashboards, catalog
- `mutation_sensitive`: proposal submit, warehouse receive, payment apply
- `report_heavy`: PDF/report requests
- `realtime_lifecycle`: channel lifecycle or diagnostic events

Rate limit decisions belong on the server, with safe low-cardinality logs.

## 9. Cache/read model integration

Cache candidates:

- request/proposal lists
- buyer request lists
- director dashboards
- warehouse ledger summaries
- accountant invoice lists
- marketplace/catalog listings

Read models should be invalidated by server-side mutation events or scheduled refresh jobs. Client-side direct Supabase calls should not be removed until shadow-mode parity is proven.

## 10. Background job integration

Background job candidates:

- proposal submit side effects
- warehouse receive/apply side effects
- accountant payment apply side effects
- PDF/report generation
- large dashboard materialization

Future server workers should expose job status through paginated, redacted BFF responses.

## 11. Observability and tracing

Future BFF spans should reuse stable names already introduced on the client, such as:

- `request.list.load`
- `proposal.submit`
- `warehouse.receive.apply`
- `accountant.payment.apply`
- `pdf.viewer.open`
- `realtime.channel.setup`

Allowed tags are low-cardinality only: flow, role, result, error class, cache hit, page size, and generic boolean flags. IDs, emails, phones, names, company names, payloads, and signed URLs remain forbidden.

## 12. Migration phases

1. Contract-only scaffold.
2. Read-only BFF shadow mode in staging.
3. Cached read models for top lists.
4. Server-side mutation boundaries for sensitive flows.
5. Background jobs for reports and PDF generation.
6. Rate limiting and abuse protection.
7. Gradual production rollout behind owner-approved feature flags.
8. Full 50K proof pack with load, limits, rollback, and observability evidence.

This wave implements phase 1 only.

## 13. Rollback / disable procedure

The current rollback is simple because no traffic is migrated:

1. Keep the BFF client config disabled.
2. Do not import the BFF adapter into active app flows.
3. If a future flag is introduced, turn it off before rollback.
4. Use `npm run release:verify -- --json` to confirm no release action was triggered.
5. Remove any future BFF route from traffic only after owner approval.

Current disable state: disabled by default.

## 14. What this wave does NOT do

This wave does not:

- deploy a server
- create a live production endpoint
- migrate production traffic
- replace existing Supabase client flows
- use server-only credentials
- change SQL, RPC, RLS, or storage policies
- change app behavior or business logic
- publish OTA
- trigger EAS build, submit, or update
- claim 50K readiness

