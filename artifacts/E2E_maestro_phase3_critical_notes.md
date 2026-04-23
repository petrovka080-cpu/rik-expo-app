# E2E_MAESTRO_PHASE_3_CRITICAL_FLOWS

## Scope

- `maestro/flows/critical/*`
- `scripts/e2e/run-maestro-critical.ts`
- `package.json`
- narrow protected-entry selector/test surface only
- narrow navigation contract/test alignment for the office tab entry

## Hard-boundary compliance

- No auth, session, or logout business-logic changes
- No Supabase auth semantic changes
- No hidden buttons, bypasses, or mocked login
- No sleep-based waits or retry loops
- No suppressions added
- No scope expansion into PDF, offline, accessibility, release config, or unrelated business domains

## Narrow production-surface changes

- Added stable tab button selectors on the real tab triggers:
  - `tabs.market`
  - `tabs.office`
  - `tabs.profile`
- Added stable protected-screen assertions:
  - `market-home-title`
  - `buyer-search-input`
- Corrected the office tab route contract to the actual tabs path:
  - `OFFICE_TAB_ROUTE = "/(tabs)/office"`
- Updated only the affected navigation tests to match the real office tab path

## Root causes closed

1. Windows Maestro env passing broke `E2E_BUYER_FIO` when the value contained spaces
2. Profile critical-entry actions were below the fold and needed deterministic scroll anchors
3. `OFFICE_TAB_ROUTE` still pointed to `/office/index`, which pushed the release app into a not-found route instead of the real office tab
4. Buyer roundtrip flow relied on a non-existent buyer-specific safe-back selector
5. Active-context switching needed a stable tab trigger to return to profile without relying on localized text

## Covered critical flows

- office safe entry from protected profile
- office -> buyer route roundtrip
- market entry from protected profile
- active context switch between office and market

## Determinism discipline

- All waits are state-based (`extendedWaitUntil`, `scrollUntilVisible`)
- No blind sleeps
- No retry loops
- Critical buyer/office data is seeded through the existing service-role test discipline, then cleaned up after the suite
- Login still happens through the real UI form with real credentials

## Wave status

`GREEN`
