# S_AI_MAGIC_01 App Action Graph And Internal-First Intelligence

Final status: `GREEN_AI_APP_ACTION_GRAPH_INTERNAL_FIRST_INTEL_READY`

## Implemented

- Added App Action Graph registries for major production screens and AI-relevant buttons.
- Added role, domain, intent, risk, tool, evidence, and approval metadata for business actions.
- Added Domain Entity Graph for procurement, warehouse, finance, documents, subcontracts, office, chat, and real estate surfaces.
- Added internal-first intelligence policy: app data first, then marketplace evidence, then policy-bound external sources.
- Added external intelligence foundation with live fetch disabled by default.
- Added BFF route-shell contracts for app graph screen/action/resolve and read-only intel compare.
- Added coverage scanner and architecture ratchet.

## Safety

- Frontend does not resolve AI graph policy.
- Frontend does not import the external intel resolver.
- External live fetch is disabled.
- Risky actions require approval metadata.
- Forbidden actions have no tool path.
- Route-shell contracts are read-only and mutation count is zero.
- No raw prompt, provider payload, or raw DB row payload is exposed.

## Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Targeted AI/action graph tests: PASS
- `npm test -- --runInBand`: PASS
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- Android APK rebuild: PASS
- Android runtime smoke: PASS
- App Action Graph Maestro: `BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS`

The E2E blocker is exact and allowed: separate explicit buyer, warehouse, accountant, contractor, foreman, and director credentials are required. No auth discovery, seed fallback, or fake pass was used.
