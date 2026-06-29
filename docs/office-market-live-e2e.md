# Office Market Live Web E2E

Dedicated live/staging web harness for the office AI estimate and marketplace media flow.

## Command

```powershell
$env:LIVE_E2E = "1"
npm run e2e:office-market-live-web
Remove-Item Env:\LIVE_E2E
```

The runner is intentionally separate from release, build, native, and full-Jest gates.

## Required Environment

- `OFFICE_E2E_TARGET_ENV` must not be `production`.
- `OFFICE_E2E_COMPANY_ID` must identify the staging company shared by all six role fixtures.
- `STAGING_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL` must point to staging project `nxrnjywzxxfdpqmzjorh`.
- `STAGING_SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be the staging anon key.
- `E2E_FOREMAN_EMAIL` / `E2E_FOREMAN_PASSWORD`
- `E2E_DIRECTOR_EMAIL` / `E2E_DIRECTOR_PASSWORD`
- `E2E_BUYER_EMAIL` / `E2E_BUYER_PASSWORD`
- `E2E_WAREHOUSE_EMAIL` / `E2E_WAREHOUSE_PASSWORD`
- `E2E_CONTRACTOR_EMAIL` / `E2E_CONTRACTOR_PASSWORD`
- `E2E_ACCOUNTANT_EMAIL` / `E2E_ACCOUNTANT_PASSWORD`

Missing or invalid credentials stop the run non-zero. There is no developer full-access fallback.

## Evidence

The only runtime evidence path is ignored:

```text
.release-runtime/office-ai-market-live-e2e/<timestamp>/summary.json
```

The summary is sanitized. It records role presence, auth success, profile/membership presence, resolved role, and a short company hash. It must not print passwords, JWTs, service-role keys, raw fixture secrets, or raw runtime evidence into tracked files.

## Coverage

- Six separate role logins: foreman, director, buyer, warehouse, contractor, accountant.
- Role isolation and same-company membership proof.
- Foreman AI estimate creation and submit to Director.
- Foreman manual estimate editing, recalculation, catalog add, and submit to Director.
- Director request visibility, PDF open, and approval.
- Buyer approved-request visibility with live DB item count matching the buyer group header.
- Warehouse, contractor, and accountant office route surfaces.
- Marketplace listing with real file upload, replace, remove, re-add, publish, card/detail/relogin image checks, public image fetch, and add-to-request duplicate guard.

## Fixture Caveats

If staging has no visible contractor work card, the summary must record `contractor_route_visible=true`, `contractor_request_visible=false`, and `contractor_skip_reason=missing_staging_contractor_work_fixture`.

If staging has no visible accountant payment proposal, the summary must record `accountant_route_visible=true`, `accountant_amounts_visible=false`, and `accountant_skip_reason=missing_staging_accountant_payment_fixture`.

## Guardrails

This harness must not:

- run against production,
- use service-role credentials,
- reset or destructively mutate the database,
- start native/iOS/Android/EAS build, submit, OTA, release, freeze, or release verification,
- claim green via skipped tests or mocked Supabase/image/PDF/buyer handoff.

The green status is:

```text
GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS
```
