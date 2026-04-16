# S1.4 PDF Boundary Before

## Current PDF initiation flows

Canonical entry points found in `src/lib/documents/pdfDocumentActions.ts`:

- `prepareAndPreviewGeneratedPdf(...)`
- `prepareAndPreviewPdfDocument(...)`
- `createModalAwarePdfOpener(...).prepareAndPreview(...)`
- direct `previewPdfDocument(...)` callers for already prepared descriptors

Role screens already pass stable PDF keys into the shared document action layer:

- Foreman request/history PDFs
- Buyer proposal/document PDFs
- Accountant payment/order PDFs
- Director request/proposal/report PDFs
- Warehouse document/register/material PDFs
- Contractor proposal PDFs

## Duplicate owners

`prepareAndPreviewPdfDocument(...)` is the main orchestration owner. It owns:

- active flow map: `activePreviewFlows`
- flow TTL map: `activePreviewFlowTimestamps`
- busy owner integration
- document preparation
- viewer navigation
- first-visible wait through `beginPdfOpenVisibilityWait(...)`

Duplicate taps under the same key were joined while the active flow was inside TTL.

## Stale risks

The active flow map stored only `Promise<DocumentDescriptor>`. When an entry aged past `ACTIVE_FLOW_MAX_TTL_MS`, a new flow was allowed to start, but the old promise could still continue.

Risk:

- old run finishes after a newer run starts
- old run can still navigate to viewer
- old run's `finally` unconditionally deletes `activePreviewFlows[flowKey]`
- old run can therefore erase the newer active run

## Premature viewer entry risks

Viewer entry was sequenced after document preparation, but stale ownership was not asserted before navigation. A delayed old run could reach `pushViewerRouteSafely(...)` after a newer run had become canonical.

## Terminal ambiguity

Failures from access/prepare/viewer readiness were propagated as generic errors. Observability had PDF lifecycle and open-family events, but no single action-boundary terminal class for:

- denied
- conflict
- retryable failure
- terminal failure
- viewer failure
- expired/stale access

