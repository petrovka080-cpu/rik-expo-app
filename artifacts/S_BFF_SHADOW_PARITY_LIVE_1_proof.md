# S-BFF Shadow Parity Live 1

Status: `PARTIAL_BFF_SHADOW_PARITY_DIFFS_FOUND`.

## Scope
- Ran live Render BFF control checks against the confirmed staging base URL.
- Probed the five mapped read endpoints without auth to validate the live auth/error envelope and redaction behavior.
- Used the existing local BFF shadow parity harness for route/status/envelope contract coverage.
- Did not route mobile traffic to BFF, did not enable mutations, did not enable providers, did not run load tests, and did not run migrations.
- No secrets, env values, raw payloads, or business rows were printed.

## Preflight
- HEAD == origin/main at start: YES (`85cf4abfa7c15309ff924828e460a41f6fed635f`)
- worktree clean at start: YES
- `STAGING_BFF_BASE_URL` present and not pending: YES
- host confirmed: `gox-build-staging-bff.onrender.com`
- local `BFF_SERVER_AUTH_SECRET`: missing
- local `BFF_DATABASE_READONLY_URL`: missing

## Live Controls
- `GET /health`: HTTP `200`, `ok=true`, `status=ok`, `serverBoundaryReady=true`, `productionTouched=false`
- `GET /ready`: HTTP `200`, `ok=true`, `status=ready`, `readRoutes=5`, `mutationRoutes=5`
- mutation routes enabled: NO
- mobile runtime routing enabled: NO
- redacted errors: YES

## Live Read Endpoint Probes
All five mapped read endpoints returned the same safe auth envelope:

| Operation | Endpoint | HTTP | Error code | Redaction |
| --- | --- | ---: | --- | --- |
| `request.proposal.list` | `/api/staging-bff/read/request-proposal-list` | `401` | `BFF_AUTH_REQUIRED` | PASS |
| `marketplace.catalog.search` | `/api/staging-bff/read/marketplace-catalog-search` | `401` | `BFF_AUTH_REQUIRED` | PASS |
| `warehouse.ledger.list` | `/api/staging-bff/read/warehouse-ledger-list` | `401` | `BFF_AUTH_REQUIRED` | PASS |
| `accountant.invoice.list` | `/api/staging-bff/read/accountant-invoice-list` | `401` | `BFF_AUTH_REQUIRED` | PASS |
| `director.pending.list` | `/api/staging-bff/read/director-pending-list` | `401` | `BFF_AUTH_REQUIRED` | PASS |

This proves the live BFF is reachable and its auth/error envelope is redacted. It does not prove live rows/meta/order parity because authenticated read probes could not be run without a local `BFF_SERVER_AUTH_SECRET`.

## Parity Classification
- status: PARTIAL; live read endpoints are auth-blocked for this runner.
- rows: NOT CHECKED; auth-blocked.
- meta: NOT CHECKED; auth-blocked.
- ordering: NOT CHECKED; auth-blocked.
- error envelope: PASS for `BFF_AUTH_REQUIRED` redacted envelope.
- redaction: PASS.

Requested target mapping:
- buyer summary/read target: not mapped in current BFF read registry
- warehouse issue queue/read target: not mapped in current BFF read registry
- warehouse incoming/read target: mapped as `warehouse.ledger.list`
- contractor read target: not mapped in current BFF read registry
- director read target: mapped as `director.pending.list`
- `/health` and `/ready`: PASS

## Source Boundary Finding
The current HTTP entrypoint does not wire live read ports from `BFF_DATABASE_READONLY_URL`.

Evidence: `scripts/server/stagingBffHttpServer.ts` calls `handleBffStagingServerRequest` with runtime config only. If an authenticated read request reaches the boundary without `readPorts`, the boundary returns `BFF_READ_PORTS_UNAVAILABLE`. This was not probed live with auth because the local auth secret is not present.

## Follow-Up Patch Wave
Recommended next wave: `S-BFF-LIVE-READ-PORTS-WIRING-1`.

Required:
- Provide `BFF_SERVER_AUTH_SECRET` to the local parity runner without printing or committing it.
- Wire Render HTTP server read ports from `BFF_DATABASE_READONLY_URL` using read-only adapters, or confirm an existing adapter and pass it into `handleBffStagingServerRequest`.
- Add focused tests proving authenticated live read routes return bounded BFF envelopes instead of `BFF_READ_PORTS_UNAVAILABLE`.
- Redeploy staging BFF after the narrow read-port patch.
- Rerun live shadow parity before any mobile routing.

## Gates
- Targeted BFF parity tests: PASS (`4` suites, `28` tests)
- JSON artifact parse: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched/accessed/mutated: NO
- staging writes: NO
- business rows dumped: NO
- mobile BFF routing enabled: NO
- mutation routes enabled: NO
- Redis/Queue/idempotency/rate/observability providers enabled: NO
- load tests run: NO
- migrations run: NO
- SQL/RPC/RLS/storage changed: NO
- secrets/env values/raw payloads printed: NO
