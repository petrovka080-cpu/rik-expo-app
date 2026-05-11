# S_AI_TOOLS_05_WAREHOUSE_STATUS_TOOL_SAFE_READ

Status: GREEN_AI_WAREHOUSE_STATUS_TOOL_SAFE_READ

Implemented `get_warehouse_status` as a SAFE_READ role-scoped warehouse status tool only.

- Input: optional `material_id`, optional `material_code`, optional `project_id`, optional `warehouse_name`, optional `object_name`, `limit <= 20`, optional `cursor`.
- Output: `available`, `reserved`, `incoming`, `low_stock_flags`, `movement_summary`, `source_timestamp`, evidence refs, and `route_operation=warehouse.api.stock.scope`.
- Role policy: director/control full access, warehouse access, foreman project/material scoped only, buyer procurement material availability only, contractor/accountant denied.
- Read boundary: existing warehouse API BFF read contract.
- Mutations: none.
- Stock mutation: `0`.
- Evidence refs: present and redacted.

Focused tests:

- `tests/ai/getWarehouseStatusTool.contract.test.ts`
- `tests/ai/getWarehouseStatusNoMutation.contract.test.ts`
- `tests/ai/warehouseRoleScope.contract.test.ts`

Gates passed:

- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand tests/ai/getWarehouseStatusTool.contract.test.ts tests/ai/getWarehouseStatusNoMutation.contract.test.ts`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
- JSON artifact parse
