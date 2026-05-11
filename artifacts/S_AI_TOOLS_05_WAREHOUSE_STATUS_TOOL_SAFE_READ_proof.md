# S_AI_TOOLS_05_WAREHOUSE_STATUS_TOOL_SAFE_READ

Status: GREEN_AI_WAREHOUSE_STATUS_TOOL_SAFE_READ

Implemented `get_warehouse_status` as a production-safe SAFE_READ tool through the existing warehouse API BFF read boundary.

- Output contract: `available`, `reserved`, `incoming`, `low_stock_flags`, `movement_summary`, `source_timestamp`, and redacted `evidence_refs`.
- Role policy: director/control full access, warehouse access, foreman project/material scoped only, buyer procurement material availability only, contractor/accountant denied.
- Mutations: `stock_mutation=0`, `mutation_count=0`.
- No direct Supabase access, no Auth Admin, no listUsers, no service role, no seed, no DB writes, no migrations.
- No model/provider changes, no OpenAI/GPT enablement, Gemini unchanged.

Focused tests:

- `tests/ai/getWarehouseStatusTool.contract.test.ts`
- `tests/ai/getWarehouseStatusNoMutation.contract.test.ts`
- `tests/ai/warehouseRoleScope.contract.test.ts`

Required proof:

- `role_scoped=true`
- `stock_mutation=0`
- `evidence_refs=true`
