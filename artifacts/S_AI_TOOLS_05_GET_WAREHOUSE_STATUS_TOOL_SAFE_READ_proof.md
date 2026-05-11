# S_AI_TOOLS_05_GET_WAREHOUSE_STATUS_TOOL_SAFE_READ

Status: GREEN_AI_GET_WAREHOUSE_STATUS_TOOL_SAFE_READ

Implemented `get_warehouse_status` as a SAFE_READ preview tool only.

- Input: optional `material_id`, optional `material_code`, optional `warehouse_name`, optional `object_name`, `limit <= 20`, optional `cursor`.
- Output: stock items, summary, availability summary, next cursor, evidence refs, and `route_operation=warehouse.api.stock.scope`.
- Read boundary: existing warehouse API BFF read contract.
- Mutations: none.
- Stock mutation: not performed.
- Issue creation: not performed.
- Reservation creation: not performed.

Focused tests:

- `tests/ai/getWarehouseStatusTool.contract.test.ts`
- `tests/ai/getWarehouseStatusNoMutation.contract.test.ts`

Gates passed:

- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand tests/ai/getWarehouseStatusTool.contract.test.ts tests/ai/getWarehouseStatusNoMutation.contract.test.ts`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
- JSON artifact parse
