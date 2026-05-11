# S_AI_DRAFT_02_DRAFT_REPORT_TOOL

Status: GREEN_AI_DRAFT_REPORT_TOOL_READY

Scope:
- Added the permanent `draft_report` DRAFT_ONLY runtime tool.
- Updated the tool schema to `object_id`, `report_kind`, optional period, notes, and source evidence refs.
- The tool returns `draft_preview`, `sections_normalized`, `missing_fields`, `risk_flags`, `requires_approval=true`, `next_action=submit_for_approval`, and redacted `evidence_refs`.

Safety proof:
- final_submit=0
- report_published=0
- finance_mutation=0
- mutation_count=0
- raw_finance_rows_exposed=false
- persisted=false
- idempotency_required_if_persisted=true
- finance_readonly drafts are limited to director/control/accountant
- no direct Supabase
- no model provider import
- no DB writes
- no UI or hook work
- no credentials in source or artifacts

Focused tests:
- `tests/ai/draftReportTool.contract.test.ts`
- `tests/ai/draftReportNoFinalSubmit.contract.test.ts`

Full gates are required before commit:
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`
