# S_AI_TOOLS_06_FINANCE_SUMMARY_TOOL_ROLE_SCOPED

Status: GREEN_AI_FINANCE_SUMMARY_TOOL_ROLE_SCOPED

Implemented `get_finance_summary` as a production-safe SAFE_READ role-scoped finance summary tool through the existing director finance BFF read boundary.

- Allowed roles: director, control, accountant.
- Denied roles: foreman, buyer, warehouse, contractor, unknown.
- Output contract: `totals`, `debt_buckets`, `overdue_count`, `document_gaps`, `risk_flags`, `redacted_breakdown`, and redacted `evidence_refs`.
- Redaction: no raw finance rows, no supplier names, no bank details, no tokens.
- Mutations: `mutation_count=0`, `payment_mutation=0`, `status_mutation=0`.
- No direct Supabase access, no Auth Admin, no listUsers, no service role, no seed, no DB writes, no migrations.
- No model/provider changes, no OpenAI/GPT enablement, Gemini unchanged.

Focused tests:

- `tests/ai/getFinanceSummaryTool.contract.test.ts`
- `tests/ai/financeRoleScopeRedaction.contract.test.ts`

Required proof:

- `non_finance_denied=true`
- `raw_finance_rows_exposed=false`
- `mutation_count=0`
