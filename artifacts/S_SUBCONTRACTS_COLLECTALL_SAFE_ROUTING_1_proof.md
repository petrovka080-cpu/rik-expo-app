# S-SUBCONTRACTS-COLLECTALL-SAFE-ROUTING-1

Final status: `GREEN_SUBCONTRACTS_COLLECTALL_SAFE_ROUTING_RELEASE_INTEGRATED`

## Scope

Changed only the subcontract paged collector boundary and its tests:

- `src/screens/subcontracts/subcontracts.shared.ts`
- `src/screens/subcontracts/subcontracts.shared.test.ts`

## Inventory

`collectAllPages` was a compatibility full-list collector used by:

- `listForemanSubcontracts`
- `listDirectorSubcontracts`
- `listAccountantSubcontracts`
- `listSubcontractItems`

The underlying page reads already used explicit ranges and deterministic ordering. The remaining risk was total collection without a max row or max page ceiling.

## Implementation

- Added `SUBCONTRACT_COLLECT_ALL_MAX_ROWS = 5000`.
- Added `SUBCONTRACT_COLLECT_ALL_MAX_PAGES = 50`.
- Replaced the open-ended loop with a bounded page loop.
- Kept existing page size, filters, ordering, and return shapes.
- Added fail-closed overflow behavior. If more rows remain after the ceiling, the collector throws instead of returning a partial list.
- Added a non-advancing pagination guard to avoid accidental infinite loops.

No silent truncation was introduced.

## Tests

Passed:

- `npx jest src/screens/subcontracts/subcontracts.shared.test.ts tests/strict-null/subcontracts.shared.phase2.test.ts tests/api/sRpc4RuntimeValidation.contract.test.ts --runInBand`
- `npm run verify:typecheck`
- `npm run lint`
- `git diff --check`
- artifact JSON parse
- post-push `release:verify -- --json`

## Safety

- No production DB writes.
- No migrations/apply/repair.
- No deploy/redeploy.
- No Render env writes.
- No BFF traffic changes.
- No business endpoint calls.
- No temporary hooks/scripts/endpoints.
- No raw payloads, raw DB rows, business rows, secrets, URLs, or env values printed intentionally.
