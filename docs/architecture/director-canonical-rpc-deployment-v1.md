## Director Canonical RPC Deployment v1

### Readiness
- Status: **NOT READY**
- Reason:
  - Required canonical dependencies are absent in active schema:
    - `public.v_director_report_issue_item_facts_v1`
    - `public.v_director_report_fact_daily_v1`
  - Canonical RPC functions are absent:
    - `public.director_report_fetch_materials_v1(...)`
    - `public.director_report_fetch_works_v1(...)`
    - `public.director_report_fetch_summary_v1(...)`

Readiness classification:
- **NOT READY** (dependencies missing in active DB + no in-session SQL apply channel)

### Functions deployed
- **None applied in active DB** from this session.
- Prepared deploy bundle:
  - [director_canonical_rpc_v1.sql](c:/dev/rik-expo-app/db/director_canonical_rpc_v1.sql)

### Dependencies
- Missing in active schema (smoke/readiness check):
  - `v_director_report_issue_item_facts_v1`
  - `v_director_report_fact_daily_v1`
- These are required by deploy bundle functions.

### Smoke results
Artifact:
- [director_rpc_deploy_smoke_v1.json](c:/dev/rik-expo-app/diagnostics/director_rpc_deploy_smoke_v1.json)

Results:
- `director_report_fetch_materials_v1` -> function not found
- `director_report_fetch_works_v1` -> function not found
- `director_report_fetch_summary_v1` -> function not found

### Capability status
- Expected runtime capability after successful deploy: `available`
- Actual now: `missing` (consistent with smoke errors)

### Parity rerun after attempted deployment step
- Command executed:
  - `node scripts/director_parity_check_v1.js`
- Result:
  - canonical endpoints still unavailable in all checked scopes
  - parity artifact updated, still P0 blocker

### Files changed
- [director_canonical_rpc_v1.sql](c:/dev/rik-expo-app/db/director_canonical_rpc_v1.sql)
- [director_rpc_deploy_smoke_v1.js](c:/dev/rik-expo-app/scripts/director_rpc_deploy_smoke_v1.js)
- [director_rpc_deploy_smoke_v1.json](c:/dev/rik-expo-app/diagnostics/director_rpc_deploy_smoke_v1.json)
- [director-canonical-rpc-deployment-v1.md](c:/dev/rik-expo-app/docs/architecture/director-canonical-rpc-deployment-v1.md)

### Validation
- Smoke command:
  - `node scripts/director_rpc_deploy_smoke_v1.js`
- Parity rerun:
  - `node scripts/director_parity_check_v1.js`
- TypeScript:
  - `npx tsc --noEmit --pretty false` (PASS)

### Verdict
- **BLOCKED**

Blocking cause:
- SQL bundle prepared, but active deployment could not be executed from this environment (no Supabase CLI / no SQL-exec RPC available in project tooling).
- Apply `db/20260309_director_reports_canonical_foundation.sql` first (or equivalent dependency bundle), then apply `db/director_canonical_rpc_v1.sql`, then rerun smoke and parity scripts.

