# S-50K-ARCH-1 BFF Boundary Proof

Status: GREEN_SCAFFOLD

Production traffic migrated: NO  
Server deployed: NO  
BFF enabled by default: NO  
50K readiness claimed: NO  
50K architecture boundary scaffold: READY_DISABLED_BY_DEFAULT

## Files Changed

- `src/shared/scale/bffContracts.ts`
- `src/shared/scale/bffSafety.ts`
- `src/shared/scale/bffClient.ts`
- `tests/scale/bffBoundary.test.ts`
- `tests/perf/performance-budget.test.ts`
- `docs/architecture/50k_server_api_boundary.md`
- `artifacts/S_50K_ARCH_1_bff_boundary_matrix.json`
- `artifacts/S_50K_ARCH_1_bff_boundary_proof.md`

## Fan-Out Flows Inspected

Discovery inspected direct Supabase query and RPC usage across `src` and `app`, with special attention to:

- request/proposal list loads
- buyer request list and request item fan-in
- proposal detail aggregation
- director pending approvals and dashboards
- warehouse ledger and stock movement flows
- warehouse receive/apply mutations
- accountant invoice and payment flows
- marketplace/catalog list reads
- PDF/report generation
- realtime channel lifecycle

The matrix records 10 mapped flows. All are contract-only in this wave.

## Contract Scaffold

Contract files:

- `src/shared/scale/bffContracts.ts`
- `src/shared/scale/bffSafety.ts`
- `src/shared/scale/bffClient.ts`

The scaffold defines stable flow names, endpoint examples, response envelopes, pagination rules, rate-limit categories, safe redaction, disabled checks, and a contract-only adapter. It does not call `fetch`, open network connections, deploy a server, or replace existing Supabase client calls.

List contracts require pagination and clamp `pageSize` to max 100. Error messages are redacted through `buildBffError`.

## Tests Added

`tests/scale/bffBoundary.test.ts` covers:

- BFF disabled by default
- missing base URL disables BFF
- explicit enabled config detection
- disabled and contract-only adapters do not call network
- list contracts require pagination
- page size clamps to max 100
- negative page and page size are handled safely
- response envelope success and error shapes
- redaction of token-like strings, JWT-like strings, signed URL tokens, email, phone, address-like strings, and admin-key-like strings
- server-only env names are documented but not read from the client scaffold
- active app flows do not import the BFF adapter for runtime use

`tests/perf/performance-budget.test.ts` keeps the existing source-module budget guard and adds a bounded exception for the three contract-only BFF scaffold files.

## Docs

`docs/architecture/50k_server_api_boundary.md` documents:

- current client-to-Supabase state
- 10K-safe client assumptions
- why 50K requires a BFF/server layer
- top fan-out flows
- future endpoint examples without live URLs
- server-only secret rules
- pagination and response envelope rules
- rate limiting
- cache/read model integration
- background jobs
- observability
- migration phases
- rollback and disable procedure
- what this wave does not do

## Safety Confirmations

- Production touched: NO
- Production writes: NO
- Server deployed: NO
- Production traffic migrated: NO
- Existing Supabase client flows replaced: NO
- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package changed: NO
- Native config changed: NO
- Server-only admin key in client: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO

## 10K Impact

This wave improves 10K readiness by making the future server boundary explicit for the flows most likely to exceed safe direct-client fan-out. It does not change active app traffic.

## 50K Impact

This wave starts the 50K architecture path by defining BFF contracts, response envelopes, pagination requirements, rate-limit categories, cache candidates, and background job candidates. It does not claim 50K readiness.

Next architecture waves should implement read-only shadow mode in staging, cached read models for top lists, server-side mutation boundaries, background jobs for reports/PDF, and rate limiting.

## Commands

Precheck commands completed before edits:

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `git diff --name-only`
- `git diff --stat`
- `npm run release:verify -- --json`

Discovery commands completed:

- `rg "\.from\(|\.select\(|\.rpc\(" src app --glob '!**/*.test.*' --glob '!**/__tests__/**'`
- `rg "requests|request_items|proposals|proposal_items|market_listings|wh_ledger|work_progress|invoice|payment|accountant|director|warehouse|catalog|buyer|contractor" src app`
- `rg "pagination|normalizePage|PageInput|range\(|limit\(" src app tests`
- `rg "safeJsonParse|validateRpcResponse|traceAsync|performanceTracing|realtime|channelCapacity" src app scripts tests`
- `rg "SUPABASE|SERVICE_ROLE|READONLY|SERVER|BFF|API_BASE|EXPO_PUBLIC" src app scripts tests docs`

Final test and gate results are recorded in the final response after execution.
