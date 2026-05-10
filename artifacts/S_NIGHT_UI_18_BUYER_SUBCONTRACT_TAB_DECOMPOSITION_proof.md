# S_NIGHT_UI_18_BUYER_SUBCONTRACT_TAB_DECOMPOSITION

final_status: GREEN_BUYER_SUBCONTRACT_TAB_DECOMPOSITION

## Scope

- Targeted `BuyerSubcontractTab` only.
- Extracted data paging, editor state, save/submit handlers, and pure tab mapping helpers.
- Kept existing direct Supabase contractor lookup in `BuyerSubcontractTab.tsx`, the already registered file boundary.
- Did not add cache, rate-limit, DB, migration, env, Supabase project, OTA/EAS/TestFlight, or native-build changes.

## Before / After

| Metric | Before | After | Result |
| --- | ---: | ---: | --- |
| `BuyerSubcontractTab.tsx` lines | 343 | 137 | -206, PASS target -100 |
| `BuyerSubcontractTab.tsx` hooks | 24 | 4 | -20, PASS target -12 |
| New provider calls in extracted boundaries | 0 | 0 | PASS |
| Direct Supabase service bypass budget | 0 | 0 | PASS |
| Unresolved unbounded selects | 0 | 0 | PASS |
| `select("*")` findings | 0 | 0 | PASS |

## Selected Files

- `src/screens/buyer/BuyerSubcontractTab.tsx`: composition shell plus existing contractor lookup boundary.
- `src/screens/buyer/BuyerSubcontractTab.model.ts`: pure patch and edit-row form mapping.
- `src/screens/buyer/useBuyerSubcontractDataModel.ts`: paging, refresh, end-reached, and loading model.
- `src/screens/buyer/useBuyerSubcontractEditorState.ts`: selection/edit/date sheet state model.
- `src/screens/buyer/useBuyerSubcontractActions.ts`: save/submit state and handlers with injected provider helpers.
- `src/screens/buyer/BuyerSubcontractTab.view.tsx`: shared date target type import.
- `tests/buyer/buyerSubcontractTab.decomposition.test.ts`: decomposition and provider-call source contracts.
- `tests/buyer/buyerSubcontractTab.model.test.ts`: focused pure model tests.
- `tests/buyer/uiUnsafeCastBatchBRowsModals.contract.test.ts`: extracted-file unsafe-cast coverage.
- `tests/perf/performance-budget.test.ts`: permanent module budget update.

## Gates

- Preflight: `git fetch origin main`, `git status --short --branch`, and `git rev-list --left-right --count HEAD...origin/main` PASS with HEAD equal to `origin/main`, ahead/behind `0/0`, and clean worktree.
- Focused tests PASS:
  - `npm test -- --runInBand tests/buyer/buyerSubcontractTab.decomposition.test.ts tests/buyer/buyerSubcontractTab.model.test.ts`
  - `npm test -- --runInBand tests/buyer/uiUnsafeCastBatchBRowsModals.contract.test.ts tests/api/buyerSubcontractAuthTransport.contract.test.ts tests/perf/performance-budget.test.ts`
- `npx tsc --noEmit --pretty false` PASS.
- `npx expo lint` PASS.
- `npm test -- --runInBand` PASS after rerunning with a longer timeout.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json` PASS.
- `git diff --check` PASS.
- Post-push `npm run release:verify -- --json` is pending until after the wave commit is pushed.

## Negative Confirmations

- No force push, tags, secrets printed, TypeScript ignore comments, type-erasure casts, or empty catch blocks added.
- No broad rewrite, Supabase project change, spend cap change, Realtime 50K/60K load, destructive/unbounded DML, OTA/EAS/TestFlight/native build, production mutation broad enablement, broad cache enablement, or broad rate-limit enablement.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
