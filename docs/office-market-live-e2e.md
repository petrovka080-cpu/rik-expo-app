# Office Market Live Web E2E

Dedicated live/staging web harness for the office AI estimate and marketplace media flow.

## Command

```powershell
$env:LIVE_E2E = "1"
npm run e2e:office-market-live-web
Remove-Item Env:\LIVE_E2E
```

The runner is intentionally separate from release, build, native, and full-Jest gates.

## Native Android command

The native matrix is a separate terminal and consumes one explicit GREEN Web summary so
the exact isolated request and Market listing created by that run can be read back from the
installed application:

```powershell
$env:LIVE_E2E = "1"
$env:OFFICE_E2E_SOURCE_WEB_SUMMARY = ".release-runtime/office-ai-market-live-e2e/<timestamp>/summary.json"
npm run e2e:office-market-live-native-android
Remove-Item Env:\OFFICE_E2E_SOURCE_WEB_SUMMARY
Remove-Item Env:\LIVE_E2E
```

The native runner requires the installed `com.azisbek_dzhantaev.rikexpoapp` development
application on an API 34 emulator. It does not build or install an APK, clear application
data, wipe the emulator, start Chrome, or use developer role switching. Each of the six
prepared staging actors signs in and out through the ordinary native UI. The runner checks
the allowed role screen, live business rows, a denied cross-role route, and the linked Market
feed/detail/owner-history surfaces.

This terminal is a role/guard/read smoke, not acceptance of native ERP mutations,
estimate lifecycle, documents, or Market media creation. Those actions require their own
receipts. Its green status is:

```text
GREEN_OFFICE_AI_MARKET_NATIVE_ROLE_GUARD_READ_SMOKE_NO_BUILD_NO_APP_DATA_CLEAR
```

After a failed run, a validated contiguous GREEN role prefix can be reused without replaying
it. Set `OFFICE_E2E_NATIVE_RESUME_SUMMARY` to that failed run's `summary.json`; the runner
requires the same source SHA, linked Web summary, API 34 device, successful sign-outs, role
order, and Market proof before it resumes at the first unfinished role.

The separate mutation terminal consumes both the Web summary and the GREEN native smoke:

```powershell
$env:LIVE_E2E = "1"
$env:OFFICE_E2E_SOURCE_WEB_SUMMARY = ".release-runtime/office-ai-market-live-e2e/<timestamp>/summary.json"
$env:OFFICE_E2E_SOURCE_NATIVE_SMOKE_SUMMARY = ".release-runtime/office-ai-market-live-native-android-e2e/<timestamp>/summary.json"
npm run e2e:office-market-live-native-actions
```

It creates an RFQ for one exact item in the isolated Web-run request, verifies its tender/item
readback and native reopen, then creates a run-namespaced Market listing. The Market path uses
the Android system photo picker, exercises upload/replace/remove/re-add, publishes through the
ordinary owner UI, verifies the listing/media rows and public image bytes, and reopens both the
native detail and owner history. It does not clear app data, build/install an APK, or use a
service-role key. Its terminal is
`GREEN_OFFICE_MARKET_NATIVE_ACTIONS_AND_MEDIA_READBACK`.

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

## Authentication ownership

This harness is the source of truth for live platform role acceptance. Every role starts at
`/auth/login`, signs in with its own prepared staging account, and keeps that account for the
whole business flow. It must not enter through `/request`, create anonymous users, or call
`developer_set_effective_role_v1`.

`scripts/dev/runLocalDeveloperRoleMatrixSmoke.ts` is a historical local-developer entitlement
smoke. Its single owner session and effective-role switch are useful only for that local review
surface; they are not evidence for staging role isolation, ERP, Market, or S27.5 platform
acceptance.

## Evidence

The only runtime evidence path is ignored:

```text
.release-runtime/office-ai-market-live-e2e/<timestamp>/summary.json
```

The summary is sanitized. It records role presence, auth success, profile/membership presence, resolved role, and a short company hash. It must not print passwords, JWTs, service-role keys, raw fixture secrets, or raw runtime evidence into tracked files.

## Console Warning Policy

The harness keeps raw browser warnings in `console_warnings`, but the green boolean is based on `console_actionable_warnings`.

Known upstream framework deprecations are recorded separately in `console_known_framework_warnings`; they do not hide application warnings. As of this gate, the only classified upstream warning is React Navigation / React Native Web emitting `props.pointerEvents is deprecated. Use style.pointerEvents` from dependency code. Any other warning remains actionable and fails the gate.

## Coverage

- Six separate role logins: foreman, director, buyer, warehouse, contractor, accountant.
- Role isolation and same-company membership proof.
- Foreman AI estimate creation and submit to Director.
- Foreman manual estimate editing, recalculation, catalog add, and submit to Director.
- Director request visibility, PDF open, and approval.
- Buyer approved-request visibility with live DB item count matching the buyer group header.
- Warehouse, contractor, and accountant office route surfaces with visible business rows.
- Marketplace listing with real file upload, replace, remove, re-add, publish, card/detail/relogin image checks, public image fetch, and add-to-request duplicate guard.
- Marketplace owner-only My Listings screen, listing card, media persistence, refresh/relogin persistence, and public market unaffected proof.

## Downstream Fixtures

Contractor and accountant are mandatory downstream checks, not fixture caveats. Route visibility alone is not a green signal.

The runner must stop with `DO_NOT_GREEN_ROUTE_ONLY` when:

- contractor route is visible but no `contractor-work-card-*` business card appears;
- accountant route is visible but no `accountant-proposal-row-*` payable row appears;
- accountant amount does not render as a positive `KGS` amount.

## Guardrails

This harness must not:

- run against production,
- use service-role credentials,
- reset or destructively mutate the database,
- start native/iOS/Android/EAS build, submit, OTA, release, freeze, or release verification,
- claim green via skipped tests or mocked Supabase/image/PDF/buyer handoff.
- claim green via contractor/accountant route shell without downstream business data.

The green status is:

```text
GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS
```
