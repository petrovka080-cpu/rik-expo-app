# Office AI Market Live Gate

Production-safe operational gate for the existing Office + AI estimate + Market live web E2E harness.

This is not a release gate, native build, EAS flow, OTA, production DB mutation, or full Jest run. The source-of-truth business flow remains `scripts/e2e/runOfficeMarketLiveWebE2E.ts`; this gate adds repeatability, role drift, cleanup-scope, no-fake-green, taxonomy, and evidence-redaction checks around it.

## How To Run Drift Audit

```powershell
npm run gate:office-ai-market-live:drift
```

The drift audit is read-only. It signs in each explicit staging role fixture with anon auth, resolves `get_my_role`, checks `profiles`, checks `company_members`, verifies that all roles belong to the same configured `OFFICE_E2E_COMPANY_ID`, and confirms that no two roles map to the same user.

The output is sanitized: role name, credential presence booleans, login/profile/membership booleans, resolved role, user hash, company hash, and role uniqueness only.

## How To Run Two-Pass Repeatability Check

```powershell
$env:LIVE_E2E = "1"
npm run gate:office-ai-market-live
npm run gate:office-ai-market-live
npm run gate:office-ai-market-live:cleanup-audit
Remove-Item Env:\LIVE_E2E -ErrorAction SilentlyContinue
```

Both live runs must pass on the same source SHA. The cleanup audit compares the two latest green summaries from `.release-runtime/office-ai-market-live-e2e/<run_id>/summary.json` and writes the trend file to `.release-runtime/office-ai-market-live-gate-trends/latest.json`.

## How Cleanup Is Bounded

The cleanup audit does not run broad deletes, table truncates, fixture resets, Auth Admin discovery, or production mutations. It is a bounded read-only audit over the two current run summaries. The scope is the two run IDs plus their listing/request/media invariants.

Green requires:

- unique run IDs
- unique marketplace listing IDs
- unique AI/manual request IDs
- unique add-to-request IDs
- same company scope
- no production/destructive flags
- no duplicate add-to-request row
- no tracked `.release-runtime` or raw photo artifacts

## STOP Categories

- `ROLE_FIXTURE_DRIFT`: role, profile, membership, or duplicate-user fixture drift.
- `AUTH_CREDENTIAL_INVALID`: missing or invalid role credentials.
- `COMPANY_SCOPE_MISMATCH`: roles are not in the same staging company scope.
- `DIRECTOR_VISIBILITY_BROKEN`: Director cannot see submitted requests.
- `DIRECTOR_PDF_BROKEN`: Director PDF evidence is missing or invalid.
- `DIRECTOR_APPROVE_BROKEN`: Director approval path failed.
- `BUYER_HANDOFF_BROKEN`: Buyer visibility after approval failed.
- `BUYER_ITEM_TRUNCATION`: Buyer cannot see the full item set.
- `WAREHOUSE_SCOPE_BROKEN`: Warehouse scoped business data is missing.
- `CONTRACTOR_VISIBILITY_BROKEN`: Contractor route lacks real business rows.
- `ACCOUNTANT_DEBUG_NOISE`: Accountant route is debug/noise contaminated or lacks amounts.
- `MARKET_UPLOAD_BROKEN`: real marketplace upload/replace/remove/readd flow failed.
- `MARKET_PERSISTENT_IMAGE_BROKEN`: image proof is blob/data/file/local/counter-only or not persistent.
- `MARKET_ADD_TO_ESTIMATE_BROKEN`: marketplace add-to-request path failed or duplicated rows.
- `AI_CONFIRMATION_BROKEN`: AI estimate submission was not user-confirmed.
- `CLEANUP_SCOPE_UNSAFE`: repeatability, bounded cleanup scope, or orphan proof failed.
- `SECRET_LEAK_RISK`: evidence contains tokens, keys, JWTs, signed URLs, or raw base64 photos.
- `INFRA_FLAKE`: reachable infrastructure failed without a product invariant.
- `UNKNOWN_PRODUCT_REGRESSION`: failure could not be classified more specifically.

## Fixture Repair Vs Source Repair

Repair fixtures when drift audit reports credential, auth, profile, membership, duplicate-user, or company-scope failures.

Repair source when the live harness reaches the app and fails business invariants: Director PDF/approval, Buyer handoff, downstream role surfaces, Market persistent image, add-to-request, or AI confirmation.

Retry only when the taxonomy reports an infra/auth flake and the summaries do not show product invariant failure.

## Why Developer Control Is Not Accepted

`developer_control_full_access` is a break-glass surface, not customer-role proof. The gate must prove six separate role sessions through normal auth and same-company membership. Any summary that uses developer control as proof fails closed.

## Market Image Proof

A marketplace photo is accepted only when the live run proves a real disk-selected PNG, replace/remove/readd, preview, published listing, card image, card image after refresh, detail image, detail image after relogin, public image fetch, and non-`blob:`, non-`data:`, non-`file:` URL evidence.

An image counter alone is not proof.

## AI Estimate Confirmation

The AI estimate must be created and explicitly submitted by the Foreman flow before Director visibility is accepted. A request created or applied without `ai_estimate_user_confirmed=true` fails the gate.

## Evidence Safe To Share

Safe evidence:

- final status
- source SHA and branch
- run IDs
- role names and hashes
- booleans for role, company, Office, Market, cleanup, and redaction invariants
- relative `.release-runtime` summary paths

Unsafe evidence:

- passwords
- access or refresh tokens
- JWTs
- Supabase anon/service keys
- signed upload URLs
- raw photo/video/base64 payloads
- local file URIs with private user paths
