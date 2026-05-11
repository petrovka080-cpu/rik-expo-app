# S_AI_TOOLS_04_COMPARE_SUPPLIERS_TOOL_SAFE_READ

Status: GREEN_AI_COMPARE_SUPPLIERS_TOOL_SAFE_READ

Implemented `compare_suppliers` as a SAFE_READ preview tool only.

- Input: `material_ids[]`, optional `project_id`, optional `location`, `limit <= 10`.
- Output: supplier cards, price and delivery range placeholders when unavailable in safe-read contracts, risk flags, recommendation summary, evidence refs, and `next_action=draft_request`.
- Read boundary: existing catalog supplier facade plus existing safe-read binding metadata.
- Mutations: none.
- Supplier confirmation: not performed.
- Order creation: not performed.
- RFQ send: not performed.
- Warehouse changes: not performed.

Focused tests:

- `tests/ai/compareSuppliersTool.contract.test.ts`
- `tests/ai/compareSuppliersNoMutation.contract.test.ts`

Gates passed:

- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand tests/ai/compareSuppliersTool.contract.test.ts tests/ai/compareSuppliersNoMutation.contract.test.ts`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
- JSON artifact parse
