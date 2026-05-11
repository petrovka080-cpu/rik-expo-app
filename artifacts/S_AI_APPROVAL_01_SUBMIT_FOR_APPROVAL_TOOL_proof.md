# S_AI_APPROVAL_01_SUBMIT_FOR_APPROVAL_TOOL

Status: GREEN_AI_SUBMIT_FOR_APPROVAL_TOOL_READY

Scope:
- Added the permanent `submit_for_approval` approval-gate runtime tool.
- Updated the tool schema to snake_case redacted approval input.
- The tool builds a local approval-gate envelope with `approval_required=true`, `audit_event=ai.action.approval_required`, and `action_status=pending`.

Safety proof:
- final_execution=0
- mutation_count=0
- persisted=false
- local_gate_only=true
- provider_called=false
- db_accessed=false
- direct_execution_enabled=false
- idempotency_key is required
- evidence_refs are required and bounded
- arbitrary raw payload input is not accepted
- no direct Supabase
- no model provider import
- no DB writes
- no UI or hook work
- no credentials in source or artifacts

Focused tests:
- `tests/ai/submitForApprovalTool.contract.test.ts`
- `tests/ai/submitForApprovalNoExecution.contract.test.ts`

Full gates are required before commit:
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
