## RLS_COVERAGE_VERIFICATION_PHASE_1 Notes

### Scope
- Verification-only wave.
- No SQL policy edits.
- No RPC semantic changes.
- No app logic changes.
- No hidden remediation inside this wave.

### Inventory Summary
- Read-only verifier: `scripts/rlsCoveragePhase1.mjs`
- Output matrix: `artifacts/RLS_coverage_phase1_matrix.json`
- App-touched public tables inventoried: `57`
- App-touched public views inventoried separately: `30`
- Repo-classified unknown relations remaining after runtime + migration reconciliation: `0`

### Expected Access Model Basis
- Expected access models in the matrix are repo-inferred from direct client `.from(...)` usage plus explicit migration contracts.
- Reference/catalog tables are classified as authenticated read-mostly boundaries unless runtime code proves direct writes.
- Business tables are classified as authenticated role/owner/object-scoped boundaries for the exact observed client operations.
- Internal ledgers, break-glass tables, and cache tables are classified as wrapper/backend-only unless repo evidence explicitly grants a smaller direct path.
- `submit_jobs` is treated as a queue boundary: direct insert/select is observed in runtime, while claim/complete/fail/recover stay on RPC/service paths.

### Shortlist
- Candidate A: `supplier_messages` — verified safe.
  Exact repo evidence exists for create table, RLS enablement, authenticated `select/insert` grants, and operation-specific policies.
- Candidate B: `app_errors` — policy missing or unverifiable.
  Runtime inserts exist in `src/lib/logError.ts`, but repo migrations do not prove table creation, grants, or RLS coverage.
- Candidate C: `requests/request_items/proposals/proposal_payments/warehouse_issues/warehouse_issue_items/notifications` — policy too broad and too wide.
  The realtime select cluster grants director-role access across multiple core tables, so it is not a safe single-slice hardening target for the next wave.
- Candidate D: `submit_jobs` — chosen for next hardening wave.
  The queue boundary is narrow, auth-sensitive, directly touched by the app, and has no provable repo-side RLS/grant coverage.

### Verified Safe Set
- `supplier_messages`
- `developer_access_overrides`
- `developer_override_audit_log`
- `foreman_ai_prompt_cache`
- `proposal_submit_mutations_v1`
- `warehouse_receive_apply_idempotency_v1`
- `warehouse_issue_request_mutations_v1`
- `warehouse_issue_free_mutations_v1`
- `accounting_pay_invoice_mutations_v1`

### Highest-Risk Unverified Set
- `submit_jobs`
- `app_errors`
- `ai_configs`
- `ai_reports`
- `chat_messages`
- `requests`
- `request_items`
- `proposals`
- `proposal_payments`
- `warehouse_issues`
- `warehouse_issue_items`
- `notifications`

### Why `submit_jobs` Was Chosen For Next Hardening
- It is a single table, not a multi-table cluster.
- It sits on an infrastructure/auth boundary rather than a cosmetic UI surface.
- Runtime code directly inserts/selects against it, so missing DB enforcement is meaningful.
- It has strong process-control value because queue boundaries affect cross-feature reliability and recovery behavior.
- It avoids the blast radius of the realtime core business-table cluster.

### What Was Intentionally Not Changed
- All RLS policies.
- All SQL functions and grants.
- All runtime TS/JS behavior.
- Existing verification tests outside this wave.
- Any remediation for uncovered tables.

### Repo Evidence Limitation
- `supabase/migrations` contains placeholder history files, so many legacy tables cannot be proven safe or unsafe from repository history alone.
- In the matrix, `null` coverage means the repository does not prove the boundary either way.
- That limitation is itself a verification finding and is not being hidden or normalized away.
