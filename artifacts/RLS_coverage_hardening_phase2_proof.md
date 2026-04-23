# RLS_COVERAGE_HARDENING_PHASE_2 Proof

## Verification Input

Source: `artifacts/RLS_coverage_phase1_matrix.json`.

Confirmed remaining gap:

```text
table: app_errors
expected_access_model: error sink boundary: direct insert only; no direct client select/update/delete
actual_risk_level: high
next_action: verify_live_db_or_prepare_single-table_hardening
observed_client_ops: insert
touched_files: src/lib/logError.ts
```

## Chosen Slice

Chosen table: `public.app_errors`.

Why this is safe:

- Single table.
- Runtime uses direct `insert` only.
- Existing payload is already redacted by `buildLogErrorPayload`.
- No valid direct read/update/delete path exists in app code.
- Service/backend path remains unaffected because the migration only grants/revokes `anon` and `authenticated`.

## Before Policy State

Repo-visible state before Phase 2:

- RLS enabled: not proven.
- Direct grants: not proven.
- Insert policy: not proven.
- Select/update/delete policy: not proven.

## After Policy State

Migration: `supabase/migrations/20260423103000_rls_coverage_hardening_app_errors_phase2.sql`.

- `create table if not exists public.app_errors`.
- `alter table public.app_errors enable row level security`.
- `revoke all on table public.app_errors from anon`.
- `revoke all on table public.app_errors from authenticated`.
- `grant insert on table public.app_errors to anon, authenticated`.
- `create policy app_errors_insert_redacted_sink ... for insert to anon, authenticated`.
- No direct `select`, `update`, or `delete` grants.
- No direct select/update/delete policies.

## Positive Proof

Allowed path remains:

- `anon` / `authenticated` can insert diagnostics through the insert-only policy when:
  - `created_by` matches `auth.uid()` including anonymous `null` identity,
  - `context` is non-empty and bounded,
  - `message` is non-empty and bounded,
  - `platform` is one of the runtime platform values.

## Negative Proof

Blocked direct paths:

- `anon` cannot select/update/delete `app_errors`.
- `authenticated` cannot select/update/delete `app_errors`.
- Inserts with missing/blank context or message are rejected by the policy.
- Authenticated inserts cannot spoof another `created_by`.

## Regression Proof

- No TS/JS runtime code changed.
- Existing `logError` payload fields remain unchanged.
- Service/backend path is not restricted by these client-role grants.
- Focused SQL tests assert operation coverage and absence of read/update/delete grants.

## Gate Results

All required gates passed:

- `npx jest tests/security/rlsCoverageVerification.test.ts --runInBand --no-coverage` - PASS.
- `npx tsc --noEmit --pretty false` - PASS.
- `npx expo lint` - PASS.
- `npm test -- --runInBand` - PASS.
- `npm test` - PASS.
- `git diff --check` - PASS.

## OTA Classification

Runtime JS/TS changed: `false`.

OTA required: `false`.

OTA status: `skip`.
