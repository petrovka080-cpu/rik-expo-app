# S-PDF-CHILD-LISTS-CEILING-CONTRACTS-1 Proof

Final status target:
GREEN_PDF_CHILD_LISTS_CEILING_CONTRACTS_RELEASE_INTEGRATED

## Scope

Closed the foreman request PDF child-list read risk from the fetchAll/unbounded-read inventory.

Changed files:

- `src/lib/pdf/foremanRequestPdf.shared.ts`
- `src/lib/pdf/pdf.builder.ts`
- `supabase/functions/foreman-request-pdf/index.ts`
- `tests/api/foremanRequestPdfChildListCeiling.contract.test.ts`

## Before

`supabase/functions/foreman-request-pdf/index.ts::loadRequestPdfModel` read `request_items` notes and full PDF item rows without explicit range or total ceiling.

`src/lib/pdf/pdf.builder.ts::buildRequestPdfModel` had the same local fallback shape: one note list read and one item list read, both scoped by `request_id` but without a total ceiling.

## After

`FOREMAN_REQUEST_PDF_CHILD_LIST_PAGE_DEFAULTS` is the permanent shared contract:

- page size: 100
- max page size: 100
- max rows: 5000
- ordering: `id asc`
- scope: `request_id`

The backend function now loads child rows through `loadForemanRequestPdfChildRows`, including an overflow probe at `maxRows`. The local builder uses `loadPagedRowsWithCeiling<RequestItemPdfRow>`.

The PDF model shape is preserved. Notes for context are derived from the same bounded item rows, eliminating the second full-list read without changing the output fields.

Overflow fails closed instead of silently truncating.

## Tests

Targeted tests:

- `tests/api/foremanRequestPdfChildListCeiling.contract.test.ts`
- `tests/api/topListPaginationBatch3.contract.test.ts`
- `tests/api/topListPaginationBatch5B.contract.test.ts`
- `tests/api/topListPaginationBatch6.contract.test.ts`

Targeted result: PASS.

Full release gates:

- `verify:typecheck`: PASS
- lint: PASS
- full Jest run-in-band: PASS
- `git diff --check`: PASS
- `release:verify -- --json`: PASS

Release state after integration:

- HEAD equals `origin/main`
- ahead: 0
- behind: 0
- worktree clean: true
- Render autoDeploy: no
- deploy in progress: false
- health: 200
- ready: 200
- pushed: true

## Safety

No response shape changes.

No production DB writes.

No migrations.

No deploy or redeploy.

No Render env writes.

No BFF traffic changes.

No business endpoint calls.

No raw DB rows, raw payloads, business rows, secrets, URLs, or env values were printed.
