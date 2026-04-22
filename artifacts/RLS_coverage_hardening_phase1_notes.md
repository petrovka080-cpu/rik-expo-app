## RLS_COVERAGE_HARDENING_PHASE_1 Notes

### Scope
- Exact chosen slice: `submit_jobs`
- Domain: queue boundary / process-control / auth-sensitive infrastructure
- Allowed changes only inside this slice:
  - one additive SQL migration for table/RLS/RPC hardening
  - one focused runtime boundary shift for queue latency reads
  - focused tests
  - proof artifacts

### Read-Only Shortlist
- Candidate A: `supplier_messages` — safe, but weaker incremental value.
  The table already has explicit create-table, RLS, grant, and policy coverage in repo history, so hardening it next would add little new risk reduction.
- Candidate B: `app_errors` — narrow, but weaker process-control impact.
  It is a real auth boundary, but the logging sink intentionally must not break user flow, and it contributes less to deterministic process control than the queue boundary.
- Candidate C: `requests/request_items/proposals/proposal_payments/warehouse_issues/warehouse_issue_items/notifications` — too wide.
  The realtime policy cluster spans multiple core tables and would violate the one-slice rule.
- Candidate D: `submit_jobs` — chosen for Phase 1.
  It is auth-sensitive, process-critical, directly touched by runtime code, and narrow enough for one isolated hardening slice.

### Why `submit_jobs` Was Chosen
- It directly affects queue determinism and recovery behavior.
- It had no provable repo-side RLS coverage after the verification wave.
- It was still narrow enough to harden without spilling into auth core, offline core, or multi-table business clusters.
- The client already separates enqueue/select from claim/complete/fail transitions, which makes a clean boundary possible.

### Real Blockers Before This Wave
- No repo migration proving `submit_jobs` table RLS/grant coverage.
- Direct client table surface existed for enqueue/select paths.
- Worker transition RPCs had no repo-side hardened boundary in `supabase/migrations`.
- Queue latency metrics still relied on a direct table read instead of the exact queue RPC boundary.

### Exact Hardening Applied
- Added additive migration:
  `supabase/migrations/20260422110000_rls_coverage_hardening_submit_jobs_phase1.sql`
- Enabled RLS for `public.submit_jobs`
- Revoked broad direct table access and re-granted only `select, insert` to `authenticated`
- Added exact direct-access policies:
  - `submit_jobs_insert_authenticated`
  - `submit_jobs_select_own`
- Hardened queue transition RPC boundary with `security definer` + `set search_path = ''`:
  - `submit_jobs_claim(text, integer)`
  - `submit_jobs_claim(text, integer, text)` legacy compat path
  - `submit_jobs_recover_stuck()`
  - `submit_jobs_mark_completed(uuid)`
  - `submit_jobs_mark_failed(uuid, text)`
  - `submit_jobs_metrics()`
- Shifted queue latency reads from direct table select to `submit_jobs_metrics` RPC without changing returned app semantics.

### What Was Intentionally Left Out
- `app_errors`
- `ai_configs`
- `ai_reports`
- notifications / realtime cluster
- any queue business-logic redesign
- any offline engine or auth-core changes
- any broad RLS cleanup outside `submit_jobs`

### Semantics Expectation
- Business semantics changed: `false`
- Queue enqueue/claim/retry/backoff semantics changed: `false`
- Queue latency output contract changed: `false`
- Direct table capability narrowed:
  - enqueue remains allowed
  - own-row readback remains allowed
  - direct client update/delete remain blocked
  - processing/recovery stays on the RPC boundary
