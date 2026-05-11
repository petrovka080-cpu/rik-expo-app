# S_AI_DRAFT_03_DRAFT_ACT_TOOL

Status: GREEN_AI_DRAFT_ACT_TOOL_READY

Scope:
- Added the permanent `draft_act` DRAFT_ONLY runtime tool.
- Updated the tool schema to `subcontract_id`, `act_kind`, `work_summary`, optional work items, period, notes, and source evidence refs.
- The tool returns `draft_preview`, `work_items_normalized`, `missing_fields`, `risk_flags`, `requires_approval=true`, `next_action=submit_for_approval`, redacted `evidence_refs`, and explicit role scope.

Safety proof:
- final_submit=0
- act_signed=0
- contractor_confirmation=0
- payment_mutation=0
- warehouse_mutation=0
- mutation_count=0
- persisted=false
- idempotency_required_if_persisted=true
- contractor role is scoped to `contractor_own_subcontract_scope`
- no direct Supabase
- no model provider import
- no DB writes
- no UI or hook work
- no credentials in source or artifacts

Focused tests:
- `tests/ai/draftActTool.contract.test.ts`
- `tests/ai/draftActNoFinalSubmit.contract.test.ts`

Full gates are required before commit:
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
