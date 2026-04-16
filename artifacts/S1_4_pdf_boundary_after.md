# S1.4 PDF Boundary After

## Canonical PDF boundary

The shared PDF action boundary now lives in:

- `src/lib/pdf/pdfActionBoundary.ts`
- `src/lib/documents/pdfDocumentActions.ts`

`prepareAndPreviewPdfDocument(...)` now derives a canonical boundary key from the explicit key or descriptor metadata, creates a run id, and records a typed boundary run.

## Authoritative readiness rule

Viewer entry is allowed only after:

- PDF access/source preparation completes
- the active boundary run is still current for the PDF key
- viewer route push starts from the current run
- viewer visible confirmation resolves for the current run

The client still initiates and renders loading/error, but final PDF success is recorded only after viewer readiness.

## Duplicate handling strategy

Duplicate tap strategy remains `join_inflight` for the same key while the active flow is inside TTL. The second trigger receives the existing promise instead of starting another independent flow.

## Stale invalidation rule

Each active PDF flow has:

- `runId`
- `startedAt`
- `promise`

The latest run id per key is tracked separately. Stale runs are rejected before prepare/viewer/visibility commit, and stale `finally` cleanup can only remove the active map entry if its run id still owns the key.

## Terminal classes

The action boundary classifies failures as:

- `success`
- `denied`
- `conflict`
- `retryable_failure`
- `terminal_failure`
- `viewer_failure`
- `access_expired`

## What remains client-owned

Still client-owned by design:

- tap initiation
- busy indicator wiring
- router/viewer entry call
- UI loading/error rendering

These are acceptable because they no longer own final PDF truth. Terminal success requires current-run readiness and viewer-visible confirmation.

## What was not changed

- PDF templates
- PDF payload/render semantics
- role access rules
- server storage/RPC contracts
- navigation architecture
- document business meaning

