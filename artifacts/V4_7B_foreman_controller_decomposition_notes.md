# V4-7B Foreman Controller Decomposition Notes

Date: 2026-04-27

Status: GREEN candidate pending commit/post-commit release guard.

## Selected Responsibility

Selected responsibility: navigation / route / screen transition orchestration.

Extracted file:

- `src/screens/foreman/hooks/useForemanNavigationFlow.ts`

Kept orchestrator:

- `src/screens/foreman/useForemanScreenController.ts`

## Why This Seam Is Safe

- The extracted hook moves existing callback wiring for history selection, history reopen, history PDF open, request PDF open, draft sheet close-after-action, calculator open, FIO modal open, and main tab switching.
- The screen controller still owns the public view-model shape and passes the same callback names to screen components.
- Business actions are still delegated to the same existing dependencies: `openRequestById`, `reopenRequestDraft`, `runRequestPdf`, `discardWholeDraft`, and `submitToDirector`.
- Error handling and telemetry for history reopen were moved with the callback and preserved.
- No SQL/RPC, runtime config, package config, or Maestro YAML was changed.

## Scope Notes

- Exactly one Foreman responsibility was extracted.
- Controller line count before: 1025.
- Controller line count after: 948.
- Line reduction: 77.
- New hook line count: 241.
- The reduction is below the recommended 150-300 range, intentionally: the clean seam was smaller, and the wave did not force unrelated lifecycle/bootstrap extraction.

## Test/Governance Notes

- `src/screens/foreman/useForemanPdf.wave1.test.tsx` was updated because its source-level assertion expected `previewForemanHistoryPdf` directly in the controller. The assertion now follows the new navigation-flow seam.
- `tests/perf/performance-budget.test.ts` was updated with a narrow V4-7B one-file exception for `useForemanNavigationFlow.ts`; the global module-count budget was not raised.
