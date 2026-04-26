# V4-7 Foreman Controller Decomposition Phase 2

## Goal

Reduce `useForemanScreenController.ts` orchestration density with one narrow extraction and zero behavior change.

## Extracted responsibility block

- `Foreman history PDF preview` moved out of `useForemanScreenController.ts`
- controller now delegates `onOpenHistoryPdf` to `previewForemanHistoryPdf(...)`
- history preview planning and guarded open flow now live in `foreman.requestPdf.service.ts`

## Changed files

- `src/screens/foreman/useForemanScreenController.ts`
  - delegates history PDF preview to the extracted service seam
  - removes duplicate legacy history preview callbacks from the controller
- `src/screens/foreman/foreman.requestPdf.service.ts`
  - keeps canonical request PDF descriptor creation
  - now also owns history PDF preview plan creation and guarded preview/error handling
- `src/screens/foreman/foreman.requestPdf.service.test.ts`
  - covers lazy preview plan creation and guarded error handling
- `src/screens/foreman/useForemanScreenController.test.tsx`
  - updates service mock shape for the extracted seam
- `src/screens/foreman/useForemanPdf.wave1.test.tsx`
  - updates source contract so the controller delegation and readable copy stay protected

## Explicit non-goals

- no changes to `useForemanDraftBoundary`
- no changes to draft semantics
- no changes to submit/warehouse/payment/business logic
- no SQL/RPC changes
- no runtime/app.json changes
- no E2E flow changes

## Why this seam

History PDF preview was a self-contained orchestration block:

- request id normalization
- history request/request details folding
- descriptor factory wiring
- dismiss-before-navigate handoff
- guarded preview boundary call
- controlled alert/observability path

That made it safe to extract without touching the Foreman draft lifecycle.
