# S Audit Night Battle 131: Unsafe Cast API Transport Reduction

## Selected Files
- `src/screens/buyer/buyer.repo.read.transport.ts`
- `tests/api/guardedPagedQueryTransport.contract.test.ts`
- `tests/api/buyerRepoReadTransport.contract.test.ts`

## Reason Selected
- Wave 130 identified API/transport as the highest-risk bucket.
- Buyer read transport had 5 safe `unknown as PagedQuery` removals available behind a clear runtime DTO guard.
- This scope avoided broader business-service changes and preserved provider ownership, ordering, pagination, fallbacks, and repository semantics.

## Before
- API/transport bucket baseline: 57 findings.
- `src/screens/buyer/buyer.repo.read.transport.ts` used 5 `unknown as PagedQuery<...>` casts for Supabase paged reads.
- Malformed provider rows were not rejected at this local transport boundary before entering `loadPagedRowsWithCeiling`.

## After
- API/transport bucket baseline: 52 findings.
- Added `createGuardedPagedQuery` inside the existing buyer read transport module, avoiding a new production source module. The adapter:
  - preserves provider errors,
  - treats null/undefined provider data as existing empty-list semantics,
  - rejects non-array payloads,
  - rejects rows that fail an explicit DTO guard.
- Added buyer read DTO guards for:
  - accounting item rows,
  - proposal item view rows,
  - request item rows,
  - proposal item link rows,
  - request-item-to-request rows.
- Removed all 5 `unknown as PagedQuery` casts from buyer read transport.

## Contract Coverage
- success payload parse: covered.
- malformed payload rejected safely: covered.
- provider error preserved: covered.
- null/undefined handled as before: covered.
- buyer read transport does not contain `unknown as PagedQuery`: covered.

## Gates
- focused tests: PASS
  - `npx jest tests/api/guardedPagedQueryTransport.contract.test.ts tests/api/buyerRepoReadTransport.contract.test.ts tests/api/buyerRepoHotspotPagination.test.ts tests/perf/performance-budget.test.ts --runInBand`
  - 4 test suites passed; 24 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 667 test suites passed, 1 skipped; 3955 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PENDING

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty-catch additions, TypeScript ignore suppressions, unsafe any-casts, scanner weakening, test deletion, or business-semantic refactor.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
