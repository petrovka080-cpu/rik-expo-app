# S-LIMITS-2 Supabase Limits Evidence Closeout

Status: `GREEN_LIMITS_EVIDENCE_RECORDED_S_LOAD_11_BLOCKED`.

## Scope
- Human-confirmed dashboard evidence was recorded as final visible Supabase evidence.
- No live 1K load run, no 50K load run, no production access, no BFF deploy, and no provider enablement.
- No env values, secrets, raw payloads, raw rows, payment details, invoices, cards, addresses, or personal billing data were recorded.

## Human Evidence Recorded
- project: `GOX BUILD`
- project ref: `nxrnjywzxxfdpqmzjorh`
- staging/not production: YES
- owner access: YES
- region: `ap-northeast-2 / Seoul`
- tier: Pro Plan
- spend cap: enabled
- included usage limit risk: YES
- compute size: Micro
- pooler mode: Session Pooler
- pool backend connections: 15
- max client connections: 200
- direct DB max connections: unknown
- statement timeout: unknown
- network restrictions: open to all IP addresses
- network bans: none shown
- DB CPU/memory/disk status: normal
- API Gateway requests last 60 minutes: 4563
- Data API response speed: 178.95ms
- API status: warning
- visible recent API errors: `POST 400 /rest/v1/rpc/wh_receive_apply_ui`, `DELETE 500 /rest/v1/wh_moves?...`, `POST 500 /rest/v1/rpc/marketplace_items_scope_page_v1`
- edge logs last hour: no results found
- Security Advisor: 258 errors, 1287 warnings, 6 info suggestions
- Performance Advisor: 0 errors, 411 warnings, 209 info suggestions
- Edge Functions count: 8
- Edge Functions are PDF/AI/content functions, not the staging BFF server
- `STAGING_BFF_BASE_URL`: missing
- backups/PITR/latest backup: unknown

## Safe DB Metadata Checks
Requested metadata checks:
- `show statement_timeout;`
- `show max_connections;`
- `show idle_in_transaction_session_timeout;`
- `show lock_timeout;`
- `select current_database();`
- `select current_setting('server_version', true);`

Result: not checked safely. Only staging REST URL and read-only key were available. There was no direct staging database URL, no `psql` binary, no Supabase CLI, no access token, and no existing metadata RPC/view that would allow these checks without SQL changes or secret exposure.

No business tables were queried. No rows were dumped.

## Decision
`S_LOAD_11_ALLOWED=false`.

S-LOAD-11 remains blocked because:
- operator approval is NO
- API/request limits remain unknown
- Auth/Realtime limits remain unknown
- Enterprise/account limits are not confirmed
- API status has visible warning/errors
- spend cap is enabled
- Security Advisor has 258 errors and 1287 warnings
- `STAGING_BFF_BASE_URL` is missing

This evidence closes the Supabase dashboard collection loop, but it does not claim full 10K or 50K readiness.

## Gates
- JSON artifact parse: PASS
- targeted limits evidence test: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- production accessed: NO
- live 1K load run: NO
- 50K load run: NO
- BFF deployed: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- SQL/RPC/RLS/storage changed: NO
- secrets/env values/raw payloads printed: NO
- fake confirmation: NO

