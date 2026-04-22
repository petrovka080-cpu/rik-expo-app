# STRICT_NULLCHECKS_GLOBAL_READINESS_PLAN Notes

## Scope discipline

- Wave type: read-only planning only
- Runtime code changes: none
- SQL changes: none
- App logic changes: none
- Global `strictNullChecks` enablement: not attempted
- Planning input source:
  - `artifacts/STRICT_global_readiness_audit_notes.md`
  - `artifacts/STRICT_global_readiness_audit_proof.md`
  - `artifacts/STRICT_global_readiness_audit_matrix.json`
  - previously green strict waves in phases 1, 2, 3, 4, 5, 7, and 8

## Planning baseline

- The last audit proved that the remaining strict-null backlog is no longer dominated by isolated runtime slices.
- High-value narrow slices still exist, but they are not the main blocker for future global strict readiness.
- The next production-safe step is therefore a rollout plan, not another opportunistic strict cleanup.

## Group A - isolated strict-safe slices

- Domains:
  - office
  - pdf viewer
  - profile
  - director
- Blocker types:
  - route/session nullable guard gaps
  - owner/render-input nullable contract drift
  - transport overload mismatch
  - optional callback invocation without deterministic guard
- Example entry points:
  - `src/screens/office/officeHub.sections.tsx`
  - `src/screens/office/OfficeHubScreen.tsx`
  - `app/pdf-viewer.tsx`
  - `src/screens/profile/profile.services.ts`
  - `src/screens/director/DirectorDashboard.tsx`
- Estimated blast radius:
  - 1-2 runtime files per slice
  - focused tests already exist for office, pdf viewer, and profile
- Prep wave needed before strict:
  - no for office, pdf viewer, profile
  - no for director, but it is lower value and weaker on regression proof

## Group B - boundary-first required

- Domains:
  - buyer
  - warehouse
  - contractor
- Blocker types:
  - loading/busy contract drift
  - optional callback boundary drift
  - nullable transport arrays
  - submit-flow input normalization gaps
- Example entry points:
  - `src/screens/buyer/hooks/useBuyerRfqPrefill.ts`
  - `src/screens/buyer/useBuyerDocuments.ts`
  - `src/screens/buyer/useBuyerProposalAttachments.ts`
  - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - `src/screens/contractor/contractor.search.ts`
  - `src/screens/contractor/contractor.workProgressSubmitFlow.ts`
- Estimated blast radius:
  - 3-6 files per cluster
  - usually one owner boundary plus helper and tests
- Prep wave needed before strict:
  - yes
  - these clusters need explicit normalize/contract-first work before a strict slice becomes safe

## Group C - owner-split required before strict

- Domains:
  - foreman lifecycle/recovery
- Blocker types:
  - nullable snapshot lifecycle
  - recovery plan drift
  - local draft rehydration returning nullable state where ready contracts expect non-null
- Example entry points:
  - `src/screens/foreman/foreman.manualRecovery.model.ts`
  - `src/screens/foreman/foreman.localDraft.ts`
  - `src/screens/foreman/foreman.draftLifecycle.model.ts`
  - `src/screens/foreman/hooks/useForemanDraftBoundary.ts`
- Estimated blast radius:
  - about 10 files
  - same-domain, but process-critical and strongly coupled
- Prep wave needed before strict:
  - yes
  - owner split is needed to separate snapshot state contracts from orchestration and UI hooks

## Group D - shared cross-domain blockers

- Domains:
  - ai
  - shared api
- Blocker types:
  - shared search/result contract drift
  - cross-role transport normalization drift
  - nullable `string | null` versus `string | undefined` contract mismatch across callers
- Example entry points:
  - `src/features/ai/assistantActions.ts`
  - `src/features/ai/aiAnalyticInsights.ts`
  - `src/lib/api/buyer.ts`
  - `src/lib/api/director.ts`
- Estimated blast radius:
  - 2-5 files per cluster, but shared contracts raise real blast radius beyond file count
- Prep wave needed before strict:
  - yes
  - these clusters need caller mapping and contract staging before any narrow strict slice

## Group E - global-risk blockers

- Domains:
  - offline core
  - scripts and verification runtime
  - root compile surface
- Blocker types:
  - shared queue lifecycle `never` collapse
  - observability/runtime script strict drift
  - one root strict surface mixing runtime, tests, and scripts
- Example entry points:
  - `src/lib/offline/mutationQueue.ts`
  - `src/lib/offline/contractorProgressQueue.ts`
  - `scripts/_shared/realtimeWebRuntime.ts`
  - `tsconfig.json`
- Estimated blast radius:
  - highest remaining global risk
  - offline runtime cluster is production-relevant
  - scripts cluster is compile-surface relevant
- Prep wave needed before strict:
  - yes, mandatory
  - this group blocks any honest broad strict rollout

## Dependency reasoning

- Group A slices can still be taken safely because they match the already successful boundary-first pattern used in phases 5, 7, and 8:
  - local entry point
  - focused regression tests
  - no cross-domain widening
- Group B cannot be taken safely as direct strict waves until the corresponding boundary contracts are normalized.
- Group C cannot be taken safely until owner boundaries are split and lifecycle contracts stop mixing nullable state, orchestration, and UI ownership.
- Group D requires explicit caller/consumer mapping first because file count understates actual blast radius.
- Group E must be staged before any future global strict enablement is considered.

## Proposed rollout order

### Wave A

- `STRICT_NULLCHECKS_PHASE_9`
- Target: office hub invite/access boundary
- Why first:
  - highest-value remaining narrow runtime slice
  - strong regression coverage
  - same successful pattern as prior office and warehouse strict slices

### Wave B

- `STRICT_NULLCHECKS_PHASE_10`
- Target: PDF viewer session boundary
- Why second:
  - still isolated
  - strong route/lifecycle test support
  - low blast radius

### Wave C

- `STRICT_BOUNDARY_PREP_PHASE_1`
- Target: root strict surface staging
- Goal:
  - stop treating runtime code, tests, and scripts as one future global flip surface
  - define how runtime, tests, and verification scripts enter strict rollout in stages

### Wave D

- `OWNER_SPLIT_PREP_PHASE_1`
- Target: offline queue core lifecycle
- Goal:
  - separate queue lifecycle record contracts from queue orchestration/reporting
  - make the offline cluster narrowable for a later strict rollout

### Wave E

- `STRICT_CLUSTER_PHASE_OFFLINE_1`
- Target: prepared offline queue lifecycle cluster
- Goal:
  - run strict rollout only after Wave D has separated the owner contracts

### Wave F

- `STRICT_BOUNDARY_PREP_PHASE_2`
- Target: shared buyer/director API null-contract normalization
- Goal:
  - normalize shared transport contracts before any buyer/director strict cluster

### Wave G

- `OWNER_SPLIT_PREP_PHASE_2`
- Target: foreman draft lifecycle and recovery
- Goal:
  - split lifecycle state contracts from orchestration and hook layers

### Wave H

- `STRICT_CLUSTER_PHASE_FOREMAN_1`
- Target: prepared foreman recovery/lifecycle cluster
- Goal:
  - run strict rollout only after Wave G reduces the owner-boundary blast radius

## Shortlist of future waves

- Candidate Wave 1 - `STRICT_NULLCHECKS_PHASE_9`
  - Type: safe strict slice
  - Target: office hub invite/access boundary
  - Status: recommended next implementation wave
- Candidate Wave 2 - `STRICT_NULLCHECKS_PHASE_10`
  - Type: safe strict slice
  - Target: PDF viewer session boundary
  - Status: recommended second implementation wave
- Candidate Wave 3 - `STRICT_BOUNDARY_PREP_PHASE_1`
  - Type: prep required
  - Target: root strict surface staging for runtime/tests/scripts
  - Status: required before any honest broader strict track
- Candidate Wave 4 - `STRICT_SCRIPTS_PREP_PHASE_1`
  - Type: high-risk deferred
  - Target: verification/runtime scripts observability cluster
  - Status: explicitly deferred until Wave C decides the staged entry path for scripts

## Direct answers

- Can we still do narrow `PHASE_9+` waves?
  - yes, but only a small number of high-value ones
  - the honest high-value count is two: office hub and PDF viewer
  - profile and director remain reserve slices, not the critical path
- Where does strict-track stop being efficient?
  - after those top two slices
  - beyond that point, prep yields more value than another opportunistic narrow strict phase
- Which zones require prep before strict?
  - buyer loading/busy boundary
  - warehouse action boundary
  - contractor submit/search boundary
  - foreman lifecycle/recovery
  - shared api drift
  - scripts cluster
  - offline core
- Can global `strictNullChecks` be enabled wider in the future?
  - yes, but not yet
  - minimum preconditions are:
    - root strict surface staged
    - offline lifecycle cluster prepared
    - foreman owner boundary prepared
    - shared API contracts normalized
    - scripts cluster given its own staged strict path

## What stayed out of the near-term plan

- no random phase 9 based only on smallest file count
- no attempt to strict-rollout offline core directly
- no attempt to fix verification scripts during planning
- no attempt to globally enable `strictNullChecks`
- no remediation hidden inside this plan wave
