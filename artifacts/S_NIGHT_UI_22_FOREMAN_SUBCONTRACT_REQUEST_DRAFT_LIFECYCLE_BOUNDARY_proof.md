# S_NIGHT_UI_22_FOREMAN_SUBCONTRACT_REQUEST_DRAFT_LIFECYCLE_BOUNDARY Proof

final_status: GREEN_FOREMAN_SUBCONTRACT_REQUEST_DRAFT_LIFECYCLE_BOUNDARY

## Scope

This wave reduced Foreman subcontract controller hook and line pressure without changing transport, cache, rate-limit, DB, Supabase project, navigation, PDF/export, or production mutation behavior.

Selected files:

- `src/screens/foreman/hooks/useForemanSubcontractController.tsx`
- `src/screens/foreman/hooks/useForemanSubcontractRequestDraftLifecycle.ts`
- `tests/foreman/foreman.subcontractController.decomposition.test.ts`
- `tests/perf/performance-budget.test.ts`

Reason selected:

- The latest architecture scanner still listed the Foreman subcontract controller among the highest combined line and hook pressure files.
- Draft item loading, request meta persistence, and request label refresh were an isolated request lifecycle slice already driven by `requestId` and existing setters.
- PDF/export, Supabase client import, draft mutation semantics, navigation, and UI rendering were left in their existing boundaries.

## Before / After Metrics

Foreman subcontract controller:

- lines: 687 -> 637
- hook matches: 24 -> 21
- inline request lifecycle effects: 3 -> 0
- inline `loadDraftItems` callback: yes -> no

New boundary:

- `src/screens/foreman/hooks/useForemanSubcontractRequestDraftLifecycle.ts`: 95 lines
- keeps stale request sequence guard
- keeps request meta persistence
- keeps request display label refresh
- keeps existing debug error surface

Architecture scanner after:

- Foreman subcontract controller line count: 638
- Foreman subcontract controller hook count: 21
- Direct Supabase service bypass findings: 0
- cache route scope remained `marketplace.catalog.search`
- unresolved unbounded selects: 0
- production `select("*")` findings: 0
- DB writes, migrations, Supabase project changes, and env changes: false

Performance budget:

- `tests/perf/performance-budget.test.ts` documents and subtracts exactly one `S_NIGHT_UI_22` request draft lifecycle hook boundary from the source module budget.

## Contracts Proven

- Draft item loading moved out of the Foreman subcontract controller.
- Request meta persistence moved out of the Foreman subcontract controller.
- Request label refresh moved out of the Foreman subcontract controller.
- Stale request sequence guard is preserved.
- Foreman controller hook budget is reduced to 21.
- No PDF/export behavior changed.
- No new direct provider expansion, route scope change, cache change, rate-limit change, DB write, or environment change.

## Gates

- Focused tests: PASS
  - `npm test -- --runInBand tests/foreman/foreman.subcontractController.decomposition.test.ts tests/foreman/ForemanSubcontractController.test.tsx tests/perf/performance-budget.test.ts`
  - Summary: 3 test suites passed, 22 tests passed
- TypeScript: PASS
  - `npx tsc --noEmit --pretty false`
- Expo lint: PASS
  - `npx expo lint`
- Full tests: PASS
  - `npm test -- --runInBand`
  - Summary: Test Suites: 708 passed, 1 skipped, 709 total; Tests: 4137 passed, 1 skipped, 4138 total
- Architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - Direct Supabase service bypass: 0
- Diff check: PASS
  - `git diff --check`
- Artifact JSON parse: PASS
  - `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('artifacts/S_NIGHT_UI_22_FOREMAN_SUBCONTRACT_REQUEST_DRAFT_LIFECYCLE_BOUNDARY_matrix.json','utf8')); console.log('artifact_json_parse=PASS')"`
- Post-push release verify: PASS
  - `npm run release:verify -- --json`
  - Verified head commit: `51ca5019527d27e29cab8df79f076c571ab8c73a`
  - Summary: tsc, expo-lint, architecture-anti-regression, jest-run-in-band, jest, and git-diff-check passed; HEAD matched origin/main with ahead/behind 0/0.

## Negative Confirmations

- No force push.
- No tags.
- No secrets printed.
- No TypeScript ignore comments added.
- No type-erasure casts added.
- No empty catches added.
- No broad rewrite.
- No Supabase project changes.
- No spend cap changes.
- No Realtime 50K/60K load.
- No destructive or unbounded DML.
- No OTA/EAS/TestFlight/native builds.
- No production mutation route broad enablement.
- No broad cache enablement.
- No broad rate-limit enablement.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
