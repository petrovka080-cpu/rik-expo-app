# S-SUPPLIER-FILES-LIST-DEFAULT-LIMIT-1 Proof

Final status target:
GREEN_SUPPLIER_FILES_LIST_DEFAULT_LIMIT_RELEASE_INTEGRATED

## Scope

Closed the remaining supplier file metadata list risk from the fetchAll/unbounded-read inventory.

Changed files:

- `src/lib/api/suppliers.ts`
- `src/lib/files.ts`
- `src/lib/files.test.ts`
- `tests/api/supplierFilesListDefaultLimit.contract.test.ts`
- `tests/api/topListPaginationBatch5B.contract.test.ts`
- `tests/api/topListPaginationBatch6.contract.test.ts`

## Before

`src/lib/api/suppliers.ts` used a ranged pagination loop for suppliers and supplier files, but there was no total `maxRows` ceiling.

`src/lib/files.ts::listSupplierFilesMeta` applied a limit only when the caller provided one. A caller could omit the limit and get an uncapped supplier file metadata list.

## After

`src/lib/api/suppliers.ts` now routes supplier and supplier file list reads through `loadPagedRowsWithCeiling` with:

- page size: 100
- max page size: 100
- max rows: 5000

The existing error-handling shape is preserved. Ceiling violations go through the existing error path instead of silently truncating rows.

`src/lib/files.ts::listSupplierFilesMeta` now has:

- default bounded metadata preview limit: 50
- maximum caller limit: 1000
- deterministic ordering: `created_at desc`, then `id desc`

Existing callers that explicitly request `all` still pass the explicit bounded max used by the prior flow.

## Tests

Targeted tests:

- `src/lib/files.test.ts`
- `tests/api/supplierFilesListDefaultLimit.contract.test.ts`
- `tests/api/topListPaginationBatch5B.contract.test.ts`
- `tests/api/topListPaginationBatch6.contract.test.ts`

Targeted result: PASS.

## Safety

No response shape changes.

No production DB writes.

No migrations.

No deploy or redeploy.

No Render env writes.

No BFF traffic changes.

No business endpoint calls.

No raw DB rows, raw payloads, business rows, secrets, URLs, or env values were printed.
