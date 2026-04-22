## RLS_COVERAGE_VERIFICATION_PHASE_1 Proof

### Verification Inputs
- Read-only verifier command:
  `node scripts/rlsCoveragePhase1.mjs`
- Existing focused regression guard reused as historical baseline:
  `npx jest tests/security/rlsCoverageVerification.test.ts --runInBand --no-coverage`
- Global gates required by this wave:
  `npx tsc --noEmit --pretty false`
  `npx expo lint`
  `npm test -- --runInBand`
  `npm test`
  `git diff --check`

### Probe Result
- App-touched public tables inventoried: `57`
- App-touched public views inventoried separately: `30`
- Verified-safe tables with explicit repo evidence: `9`
- High-risk tables without provable repo-side coverage or with too-broad scope: `48`
- Focused regression baseline: `1` suite passed, `6` tests passed

### What The Matrix Proves
- Repo explicitly proves safe coverage for:
  `supplier_messages`
  `developer_access_overrides`
  `developer_override_audit_log`
  `foreman_ai_prompt_cache`
  `proposal_submit_mutations_v1`
  `warehouse_receive_apply_idempotency_v1`
  `warehouse_issue_request_mutations_v1`
  `warehouse_issue_free_mutations_v1`
  `accounting_pay_invoice_mutations_v1`
- Repo does not prove RLS/grant coverage for many direct client tables, including:
  `submit_jobs`
  `app_errors`
  `ai_configs`
  `ai_reports`
  `chat_messages`
  core business tables such as `requests`, `request_items`, `proposals`, `proposal_payments`, `warehouse_issues`, and `warehouse_issue_items`
- Repo contains a director realtime cluster with explicit select policies across:
  `requests`
  `request_items`
  `proposals`
  `proposal_payments`
  `warehouse_issues`
  `warehouse_issue_items`
  `notifications`
  This cluster is real evidence of enforcement work, but it is also too wide for a single-table hardening slice and appears broader than a narrow owner/object-scoped boundary.

### Expected vs Actual Enforcement
- Expected model was derived from runtime usage plus explicit migration contracts.
- Actual enforcement was derived from repo-visible `create table/view`, RLS enablement, grants/revokes, and policy statements.
- `null` operation coverage in the matrix means the repository does not prove the boundary either way.
- This is not a parser fallback and not a silent pass: it is the explicit verification output for legacy tables hidden behind placeholder migration history.

### Mismatch Map
- `supplier_messages`
  Expected: authenticated related-party `select/insert`.
  Actual: explicit RLS + authenticated grants + matching select/insert policies.
  Result: verified safe.
- `app_errors`
  Expected: direct insert-only error sink.
  Actual: no repo-visible create/grant/RLS evidence.
  Result: policy missing or unverifiable.
- `submit_jobs`
  Expected: exact queue boundary with direct insert/select and RPC-owned processing mutations.
  Actual: no repo-visible create/grant/RLS evidence.
  Result: chosen next hardening slice.
- `requests/request_items/proposals/proposal_payments/warehouse_issues/warehouse_issue_items/notifications`
  Expected: role/owner/object-scoped business access.
  Actual: repo-visible director realtime select policies, but no complete repo proof for the full boundary and the cluster is too broad for a verification-wave remediation.
  Result: too wide for next wave; needs a narrower hardening decomposition.

### Chosen Next Hardening Slice
- Candidate D: `submit_jobs`
- Why:
  It is single-table, auth-sensitive, process-critical, directly touched by runtime code, and still lacks provable DB-side enforcement in repo history.

### Runtime / OTA Classification
- Runtime JS/TS semantics changed: `false`
- SQL/runtime behavior changed: `false`
- This wave adds proof artifacts plus a read-only verifier only.
- OTA required: `false`
- OTA status: `skipped`

### Green Criteria For This Verification Wave
- Inventory collected without remediation.
- Expected-vs-actual access map produced.
- Shortlist produced with safe / missing / too-broad / chosen outcomes.
- Proof artifacts generated.
- Runtime semantics unchanged.
- Final GREEN depends on the gate results recorded below.

### Gate Results
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS
