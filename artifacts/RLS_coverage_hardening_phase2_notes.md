# RLS_COVERAGE_HARDENING_PHASE_2 Notes

## Shortlist From Verification Output

| Candidate | Risk | Access mismatch | Blast radius | Verdict |
| --- | --- | --- | --- | --- |
| Candidate A - `ai_configs` | Missing/unverifiable repo-side RLS for authenticated config reads | Authenticated read-mostly config access; writes should remain backend/admin-only | Single table, but lower immediate auth-risk than a write sink | Safe, lower value |
| Candidate B - `ai_reports` | Missing/unverifiable repo-side RLS for direct upsert | Company-scoped report sink with insert/update semantics | Requires company ownership model proof and upsert parity | Blocked by owner/company coupling |
| Candidate C - `requests/request_items/proposals/proposal_payments/warehouse_issues/warehouse_issue_items/notifications` | Existing realtime select policy cluster appears broad/incomplete | Role/object-scoped business access | Multi-table core business cluster | Too wide for Phase 2 |
| Candidate D - `app_errors` | Direct client insert path exists but repo did not prove RLS/grant coverage | Insert-only diagnostics sink; no direct select/update/delete expected | One table, one migration, no runtime code changes | Chosen |

## Chosen Risk

`app_errors` was selected because `src/lib/logError.ts` inserts directly into the table in production runtime, while `RLS_COVERAGE_VERIFICATION_PHASE_1` found no repo-visible table/RLS/grant/policy proof for it.

## Exact Scope

- One table: `public.app_errors`.
- One migration: `20260423103000_rls_coverage_hardening_app_errors_phase2.sql`.
- Focused SQL assertions added to the existing RLS coverage test file.
- No application runtime behavior changed.
- No neighboring tables, RPCs, policies, or broad security cleanup touched.

## Before

- Table/RLS/grant coverage was missing or unverifiable from repo history.
- Runtime direct operation: `insert`.
- Expected model: clients may write redacted diagnostics, but must not read/update/delete diagnostics directly.

## After

- `public.app_errors` has a repo-visible table contract.
- RLS is enabled.
- `anon` and `authenticated` receive only `insert`.
- No direct `select`, `update`, or `delete` grants are introduced.
- Insert policy constrains owner attribution and payload shape fields used by existing runtime.

## Semantics

Runtime semantics changed: `false`.

The existing logging payload contract remains `context`, `message`, `extra`, and `platform`. The migration only adds database enforcement for the already expected insert-only sink.
