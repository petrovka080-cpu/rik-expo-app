**Scope**
`B2.PDF_DOCUMENT_ACTIONS_OWNER_SPLIT` touched only the PDF document action boundary:

- `src/lib/documents/pdfDocumentActions.ts`
- `src/lib/documents/pdfDocumentActionTypes.ts`
- `src/lib/documents/pdfDocumentActionPreconditions.ts`
- `src/lib/documents/pdfDocumentActionError.ts`
- `src/lib/documents/pdfDocumentActionPlan.ts`
- `src/lib/documents/pdfDocumentPrepareAction.ts`
- `src/lib/documents/pdfDocumentPreviewAction.ts`
- `src/lib/documents/pdfDocumentShareAction.ts`
- `src/lib/documents/pdfDocumentExternalOpenAction.ts`
- `src/lib/pdf/pdf.runner.ts`

Focused regression/proof tests added or updated:

- `src/lib/documents/pdfDocumentActions.test.ts`
- `src/lib/documents/pdfDocumentActionPreconditions.test.ts`
- `src/lib/documents/pdfDocumentActionError.test.ts`
- `src/lib/documents/pdfDocumentActionPlan.test.ts`
- `src/lib/documents/pdfDocumentPreviewAction.test.ts`
- `src/lib/documents/pdfDocumentShareAction.test.ts`
- `src/lib/documents/pdfDocumentExternalOpenAction.test.ts`
- `tests/pdf/pdfDocumentActionsDecompositionAudit.test.ts`
- `tests/pdf/pdfOpenLatencyAudit.test.ts`
- `tests/perf/performance-budget.test.ts`

Untouched on purpose:

- viewer `download/print`
- `attachmentOpener.ts`
- PDF backend / generation pipeline
- manifest / source_version / artifact_version semantics
- auth / navigation / storage / API contracts
- role business logic

**Initial Ownership Map**
Before `B2`, `src/lib/documents/pdfDocumentActions.ts` simultaneously owned:

- prepare execution and source normalization
- preview branching and router handoff
- share execution
- external-open execution
- URI / canonical-source preconditions
- action error mapping
- busy / visibility / inflight orchestration
- breadcrumbs / observability

That made preview/share/external behavior hard to test independently and let one file carry several platform and action domains at once.

**New Owner Boundaries**
- `pdfDocumentActionPreconditions.ts`
  Pure URI/source checks, canonical remote-source enforcement, preview eligibility helpers.
- `pdfDocumentActionError.ts`
  Pure error name/message extraction plus `normalizePdfDocumentActionError`.
- `pdfDocumentActionPlan.ts`
  Pure action / preview mode planning that composes existing planner modules instead of re-implementing them.
- `pdfDocumentPrepareAction.ts`
  Prepare execution owner.
- `pdfDocumentPreviewAction.ts`
  Preview execution owner, including in-memory remote session, stored session, router handoff, direct preview fallback, iOS oversize guard, and preview lifecycle observation.
- `pdfDocumentShareAction.ts`
  Share execution owner.
- `pdfDocumentExternalOpenAction.ts`
  External-open execution owner.

**What Stayed In The Orchestrator**
`src/lib/documents/pdfDocumentActions.ts` intentionally remains the only public entrypoint and still owns:

- public export surface
- inflight join / TTL cleanup / stale-run discipline
- busy orchestration
- prepare -> preview order
- visibility wait / failure normalization at the boundary
- active flow cleanup and latest-run cleanup
- critical breadcrumb helper injection

`prepareAndPreviewPdfDocument(...)` was intentionally not moved out of the file, so duplicate tap joining, stale TTL handling, busy cleanup, and visibility guarantees stayed in their original orchestration owner.

**Behavior Preserved**
- Public exports remain exactly:
  - `getPdfFlowErrorMessage`
  - `preparePdfDocument`
  - `previewPdfDocument`
  - `sharePdfDocument`
  - `prepareAndPreviewPdfDocument`
  - `openPdfDocumentExternal`
- Caller signatures and result shapes did not change.
- Same prepare/preview/share/external semantics remain.
- Same inflight join, stale TTL, busy cleanup, and visibility sequencing remain.
- Same router handoff to `/pdf-viewer` remains.
- Same user-visible error contract remains, with one correction: the default fallback string is now the intended readable Russian text `Не удалось открыть PDF` instead of mojibake.

**Why This Does Not Change Business Logic**
- Existing pure planners remain the source of truth. `B2` composes them; it does not fork their logic.
- No document formulas, template semantics, or viewer semantics changed.
- No role-specific screen contract changed.
- The only moved code is action ownership code that was already inside the monolith.

**Residual Risk Intentionally Left Alone**
- Native OS-level share sheet / external viewer outcomes still depend on platform environment rather than on the JS action boundary alone.
- Android runtime verification was blocked by dev-route settling in the current emulator environment before the proof could reach the action path; this is recorded in proof instead of being hidden or “fixed” inside the B2 scope.
