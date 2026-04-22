# STRICT_NULLCHECKS_GLOBAL_READINESS_PLAN Proof

## Readiness audit inputs used

- `artifacts/STRICT_global_readiness_audit_notes.md`
- `artifacts/STRICT_global_readiness_audit_proof.md`
- `artifacts/STRICT_global_readiness_audit_matrix.json`
- strict inventory baseline:
  - `401` strict-null errors
  - `93` files
  - `136` runtime-file errors
  - `265` test/script errors
- current audit verdict:
  - `GLOBAL_STRICT_READINESS_PLAN`

## Why this order is safe

- The order starts with two proven narrow-slice patterns:
  - office boundary work
  - PDF route/session boundary work
- Those slices are aligned with previously successful strict waves:
  - phase 5 office reentry
  - phase 7 warehouse PDF boundary
  - phase 8 canonical PDF backend invoker
- After the remaining two high-value narrow slices, the plan deliberately stops narrow implementation-by-inertia.
- The next planned waves switch to prep because the dominant remaining risk is structural:
  - root strict surface coupling
  - offline lifecycle ownership
  - shared transport contracts
  - foreman lifecycle ownership

## Why certain clusters are deferred

- Offline queue core is deferred from immediate strict rollout because it still has the highest production-relevant shared runtime cluster.
- Verification/runtime scripts are deferred from direct strict rollout because their inclusion in the root compile surface would distort any honest global readiness claim.
- Foreman lifecycle/recovery is deferred from direct strict rollout because nullable snapshot state is still mixed with orchestration and UI ownership.
- Shared API null drift is deferred from direct strict rollout because caller mapping must happen before a narrow fix can remain narrow.

## Why global enable is not ready

- Root `tsconfig.json` still includes runtime code, tests, and scripts in one surface.
- Bucket D from the last audit remains dominant:
  - `262` errors across `38` files
- The highest-risk runtime cluster is still `src/lib/offline/*`.
- The largest structural non-runtime cluster is still `scripts/**`.
- Therefore a broader `strictNullChecks` enablement would still be configuration-chaotic rather than production-safe.

## Dependency map

### Office hub invite/access boundary

- Depends on:
  - existing office regression suite
- Must not be batched with:
  - buyer/shared API changes
  - scripts cleanup
- Shared contracts:
  - office access screen data
  - invite handoff render contract
- Prep required:
  - no

### PDF viewer session boundary

- Depends on:
  - existing PDF route/lifecycle tests
- Must not be batched with:
  - offline or foreman lifecycle prep
- Shared contracts:
  - PDF session snapshot and route model
- Prep required:
  - no

### Buyer loading/busy boundary

- Depends on:
  - normalize/contract-first prep for `BusyLike` and request-id handling
- Must not be batched with:
  - shared API drift or contractor boundary work
- Shared contracts:
  - busy/loading helper contracts
- Prep required:
  - yes

### Warehouse action boundary

- Depends on:
  - callback contract normalization and test/runtime separation
- Must not be batched with:
  - shared PDF transport redesign
- Shared contracts:
  - header API scroll callback surface
- Prep required:
  - yes

### Contractor search/progress boundary

- Depends on:
  - transport array normalization and submit-row state classification
- Must not be batched with:
  - warehouse or shared API prep
- Shared contracts:
  - transport list normalization helpers
- Prep required:
  - yes

### Foreman lifecycle/recovery cluster

- Depends on:
  - owner split for snapshot contracts
  - recovery-state contract separation
- Must not be batched with:
  - shared API null drift
  - offline queue prep
- Shared contracts:
  - local draft snapshot lifecycle
  - recovery plans
- Prep required:
  - yes, owner-split first

### Shared API null-contract drift

- Depends on:
  - buyer/director caller mapping
  - normalize-contract staging
- Must not be batched with:
  - foreman recovery rollout
  - office/pdf isolated waves
- Shared contracts:
  - buyer/director transport contracts
- Prep required:
  - yes, boundary-first

### Offline queue core lifecycle

- Depends on:
  - owner split of lifecycle record contracts from orchestration
  - root strict-surface staging plan
- Must not be batched with:
  - scripts strict prep
  - foreman lifecycle strict rollout
- Shared contracts:
  - queue lifecycle records
  - retry and quarantine telemetry
- Prep required:
  - yes, owner-split first

### Verification/runtime scripts cluster

- Depends on:
  - root strict-surface staging plan
- Must not be batched with:
  - runtime cluster rollouts
- Shared contracts:
  - realtime runtime helpers
  - observability event shapes
- Prep required:
  - yes, global staging first

## Minimum path to enterprise-safe global strict readiness

1. Complete `STRICT_NULLCHECKS_PHASE_9` on office hub invite/access boundary.
2. Complete `STRICT_NULLCHECKS_PHASE_10` on PDF viewer session boundary.
3. Complete `STRICT_BOUNDARY_PREP_PHASE_1` for root strict-surface staging.
4. Complete `OWNER_SPLIT_PREP_PHASE_1` for offline queue lifecycle ownership.
5. Complete `STRICT_CLUSTER_PHASE_OFFLINE_1` on the prepared offline cluster.
6. Complete `STRICT_BOUNDARY_PREP_PHASE_2` for shared buyer/director API contracts.
7. Complete `OWNER_SPLIT_PREP_PHASE_2` for foreman lifecycle/recovery.
8. Complete `STRICT_CLUSTER_PHASE_FOREMAN_1` on the prepared foreman cluster.

This is the minimum credible path identified by the current audit input. Any faster path would require hiding either the root compile-surface problem or the offline/foreman shared ownership problem.

## Planning verdict

```text
The repo can still support two high-value narrow strict phases, but the strict program is no longer safely driven by narrow phases alone. After those two slices, the correct production-safe path is boundary prep and owner-split prep before the next prepared strict cluster rollouts.
```

## Runtime semantics

- Runtime semantics changed: `false`
- Code paths changed: none
- OTA status: `skip`
- Reason: planning/artifacts-only wave

## Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS (`440` passed suites, `1` skipped, `2746` passed tests)
- `npm test`: PASS (`440` passed suites, `1` skipped, `2746` passed tests)
- `git diff --check`: PASS
