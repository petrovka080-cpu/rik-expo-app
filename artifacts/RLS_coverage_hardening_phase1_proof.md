## RLS_COVERAGE_HARDENING_PHASE_1 Proof

### Probe Result
- Shortlist completed before implementation.
- Safe slice chosen: `submit_jobs`
- Reason chosen:
  narrow auth-sensitive queue boundary with strong process-control value and no cross-domain blast radius

### Before Hardening
- `submit_jobs` had no repo-side migration proving:
  - table creation in `supabase/migrations`
  - RLS enablement
  - grants / revokes
  - policies
  - security-definer queue transition RPCs
- Runtime queue latency path still read the table directly instead of using the queue metrics RPC boundary.

### After Hardening
- `submit_jobs` now has an additive migration in repo history with:
  - table creation/additive columns/indexes
  - `alter table public.submit_jobs enable row level security;`
  - direct table grants reduced to authenticated `select, insert`
  - insert policy: authenticated enqueue only in the `pending` state
  - select policy: authenticated own-row readback only
  - no direct update/delete policy path
- Queue worker/process transitions now sit behind explicit hardened RPCs:
  - `submit_jobs_claim(text, integer)`
  - `submit_jobs_claim(text, integer, text)`
  - `submit_jobs_recover_stuck()`
  - `submit_jobs_mark_completed(uuid)`
  - `submit_jobs_mark_failed(uuid, text)`
  - `submit_jobs_metrics()`
- All queue RPCs in the migration are:
  - `security definer`
  - `set search_path = ''`
  - explicitly granted only to `authenticated, service_role`
  - revoked from `public, anon`

### Runtime Contract Before / After
- Before:
  - enqueue used direct table insert
  - queue latency used direct table select
  - claim/complete/fail/recover used RPCs without repo-proven hardening
- After:
  - enqueue still uses direct table insert
  - queue latency now uses `submit_jobs_metrics` RPC
  - claim/complete/fail/recover still use the same logical RPC boundary
- User-visible queue semantics:
  unchanged

### Focused Regression Proof
- `npx jest tests/security/submitJobsRlsHardeningPhase1.test.ts --runInBand --no-coverage` PASS
- `npx jest tests/observability/queueLatencyMetrics.test.ts --runInBand --no-coverage` PASS
- `npx jest src/lib/infra/jobQueue.test.ts --runInBand --no-coverage` PASS

### Global Gates
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS

### Runtime / Release Classification
- Runtime JS/TS changed: `true`
- SQL changed: `true`
- Business semantics changed: `false`
- OTA required if all gates go green: `true`
- Release tail status at artifact capture time: `ready_for_commit_push_ota`
