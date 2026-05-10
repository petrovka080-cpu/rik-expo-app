# S_NIGHT_UI_15_FOREMAN_SUBCONTRACT_DRAFT_SECTIONS_SPLIT

final_status: GREEN_FOREMAN_SUBCONTRACT_DRAFT_SECTIONS_SPLIT

## Selection

Selected files:
- `src/screens/foreman/ForemanSubcontractTab.sections.tsx`
- `src/screens/foreman/ForemanSubcontractDraftSections.tsx`
- `tests/foreman/foremanSubcontractDraftSections.decomposition.test.ts`
- `tests/perf/performance-budget.test.ts`

Reason selected: `ForemanSubcontractTab.sections.tsx` was still a top line-count UI debt file, while its draft/detail modal bodies were presentational and transport-free. This was the safest next priority: real render debt reduction without touching business logic, DB, transport, cache, or rate-limit behavior.

## Before And After Metrics

Before:
- `ForemanSubcontractTab.sections.tsx` lines: 726
- `ForemanSubcontractTab.sections.tsx` hook calls: 5
- `ForemanSubcontractTab.sections.tsx` imports: 23
- Dedicated draft-section files: 0
- Component debt god-component count: 28

After:
- `ForemanSubcontractTab.sections.tsx` lines: 410
- `ForemanSubcontractTab.sections.tsx` hook calls: 3
- `ForemanSubcontractTab.sections.tsx` imports: 19
- `ForemanSubcontractDraftSections.tsx` lines: 324
- `ForemanSubcontractDraftSections.tsx` hook calls: 2
- Dedicated draft-section files: 1
- Component debt god-component count: 27

Delta:
- Sections facade lines: -316
- Sections facade hook calls: -2
- Sections facade imports: -4
- Component debt god-component count: -1

## Proof

- Moved `SubcontractDetailsModalBody` and `DraftSheetBody` into `ForemanSubcontractDraftSections.tsx`.
- Kept `ForemanSubcontractTab.sections.tsx` as the public facade and re-exported both components so existing imports stay valid.
- Added a decomposition contract proving the bodies moved, the facade remains below the line budget, and the extracted bodies are free of Supabase, fetch, cache, and rate-limit references.
- Updated the performance budget to account for exactly one durable foreman draft-section module.
- Existing foreman section and subcontract controller tests still pass.

## Gates

- Focused tests: PASS
  - `npx jest tests/foreman/foremanSubcontractDraftSections.decomposition.test.ts src/screens/foreman/ForemanSubcontractTab.sections.test.tsx tests/foreman/foreman.subcontractController.decomposition.test.ts tests/perf/performance-budget.test.ts --runInBand`
  - 4 suites passed, 23 tests passed.
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
  - 701 suites passed, 1 skipped; 4102 tests passed, 1 skipped.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- Artifact JSON parse: PASS
- Post-push `npm run release:verify -- --json`: PENDING

## Negative Confirmations

- No business logic changes.
- No transport changes.
- No DB, env, or production calls.
- No production mutation.
- No Supabase project changes.
- No cache or rate-limit changes.
- No route expansion.
- No secrets printed.
- No TypeScript suppressions, unsafe any-casts, or empty catch blocks added.
- No OTA/EAS/TestFlight/native builds.
- No Realtime 50K/60K load.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
