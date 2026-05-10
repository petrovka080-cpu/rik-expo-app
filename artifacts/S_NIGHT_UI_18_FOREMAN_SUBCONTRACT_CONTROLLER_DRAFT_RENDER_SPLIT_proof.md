# S_NIGHT_UI_18_FOREMAN_SUBCONTRACT_CONTROLLER_DRAFT_RENDER_SPLIT

final_status: GREEN_FOREMAN_SUBCONTRACT_CONTROLLER_DRAFT_RENDER_SPLIT

## Selection

- Selected `src/screens/foreman/hooks/useForemanSubcontractController.tsx` because the fresh architecture scanner reported it as the top line-count component debt item after WAVE 17.
- Scope stayed UI/controller-only: render composition moved to `ForemanSubcontractControllerView.tsx`, and draft submit/cancel orchestration moved to `useForemanSubcontractDraftActions.ts`.
- PDF, transport, cache, rate-limit, DB, env, navigation, and production mutation paths were left unchanged.

## Metrics

- Architecture scanner: `useForemanSubcontractController.tsx` lines 731 -> 688, hook count 25 -> 24.
- Source count: lines 730 -> 687, hook call-sites 25 -> 24.
- New boundaries: 1 render-only view, 1 draft action hook.

## Gates

- Focused tests PASS: `npx jest tests/foreman/foreman.subcontractController.decomposition.test.ts src/screens/foreman/ForemanSubcontractPdfGuard.test.ts tests/foreman/ForemanSubcontractController.test.tsx tests/perf/performance-budget.test.ts --runInBand`.
- TypeScript PASS: `npx tsc --noEmit --pretty false`.
- Expo lint PASS: `npx expo lint`.
- Full Jest PASS: `npm test -- --runInBand` with 705 suites passed, 1 skipped; 4118 tests passed, 1 skipped.
- Architecture scanner PASS: `npx tsx scripts/architecture_anti_regression_suite.ts --json`, service bypass 0, unresolved unbounded selects 0, select star findings 0.
- Diff whitespace PASS: `git diff --check`.
- Artifact JSON parse PASS. `release:verify` is run post-commit/post-push because the release guard requires a clean repository state.

## Safety

- No production calls, DB writes, migrations, Supabase project changes, env changes, cache changes, rate-limit changes, Realtime load, OTA/EAS/TestFlight/native builds, force push, tags, `@ts-ignore`, `as any`, or `catch {}`.
- Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
