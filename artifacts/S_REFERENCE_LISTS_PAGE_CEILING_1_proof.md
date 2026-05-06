# S-REFERENCE-LISTS-PAGE-CEILING-1 Proof

Final status: `GREEN_REFERENCE_LISTS_PAGE_CEILING_RELEASE_INTEGRATED`

## Scope

This wave closes the remaining reference/profile-scoped page-through readers that already had explicit Supabase `range` windows and deterministic ordering, but did not have a total row ceiling.

Targets:

- `src/components/foreman/useCalcFields.ts`
- `src/screens/foreman/foreman.dicts.repo.ts`
- `src/screens/profile/profile.services.ts`

## Contract

All changed readers now use the permanent shared `loadPagedRowsWithCeiling` helper with:

- `pageSize`: 100
- `maxPageSize`: 100
- `maxRows`: 5000
- overflow behavior: return or throw an error from the helper path
- no silent truncation
- ceiling probe enabled by the helper for exact-boundary reads

Ordering and filters are preserved:

- calc fields: `work_type_code`, ordered by `sort_order`, then `basis_key`
- foreman dictionaries/apps: existing table-specific order columns, then `code` or `app_code`
- profile memberships: `user_id`, ordered by `company_id`

No report aggregation was required for this wave because these are reference/profile-scoped list readers, not full report totals.

## Gates

- Targeted Jest:
  - `tests/api/referenceListPageCeiling.contract.test.ts`
  - `tests/api/topListPaginationBatch5A.contract.test.ts`
  - `tests/api/topListPaginationBatch5B.contract.test.ts`
  - `tests/api/topListPaginationBatch6.contract.test.ts`
  - `tests/api/topListPaginationBatch7.contract.test.ts`
- Typecheck: passed
- Lint: passed
- `git diff --check`: passed
- Artifact JSON parse: passed
- `release:verify -- --json`: pass after integration

## Safety

No production DB writes, migrations, deploy, redeploy, Render env writes, BFF traffic changes, business endpoint calls, temporary hooks, temporary scripts, or temporary endpoints were performed. No raw DB rows, raw business rows, raw payloads, secrets, tokens, env values, or service URLs are included in this artifact.
