# S_AI_DRAFT_01_DRAFT_REQUEST_TOOL

Status: GREEN_AI_DRAFT_REQUEST_TOOL_READY

Scope:
- Added the permanent `draft_request` DRAFT_ONLY runtime tool.
- Updated the registry schema contract to `project_id`, `items[]`, optional supplier/window/notes input.
- The tool returns `draft_preview`, `items_normalized`, `missing_fields`, `risk_flags`, `requires_approval=true`, `next_action=submit_for_approval`, and redacted `evidence_refs`.

Safety proof:
- final_submit=0
- supplier_confirmation=0
- order_created=0
- warehouse_mutation=0
- mutation_count=0
- persisted=false
- idempotency_required_if_persisted=true
- no direct Supabase
- no model provider import
- no DB writes
- no UI or hook work
- no credentials in source or artifacts

Focused tests:
- `tests/ai/draftRequestTool.contract.test.ts`
- `tests/ai/draftRequestNoFinalSubmit.contract.test.ts`

Full gates are required before commit:
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
