# STRICT_NULLCHECKS_GLOBAL_READINESS_AUDIT Notes

## Scope discipline

- Wave type: read-only audit only
- Runtime code changes: none
- SQL changes: none
- App logic changes: none
- Global `strictNullChecks` flip: not attempted

## Probe summary

- Repo-wide probe command: `npx tsc --noEmit --pretty false --strictNullChecks`
- Current root config still compiles with `strict: false`, but the strict probe reports `401` strict-null errors across `93` files.
- `136` errors are in runtime files and `265` errors are in tests/scripts.
- `tsconfig.json` currently includes `**/*.ts` and `**/*.tsx`, so runtime code, verification scripts, and tests are all part of the same future global strict surface.

## Bucket A — safe next strict slices

- `app/pdf-viewer.tsx`
  - Domain: PDF viewer route/render-input boundary
  - Real blockers: `next.session` possibly `null` at three route lifecycle sites
  - Blast radius: 1 runtime file
  - Focused proof support: `tests/routes/pdf-viewer.lifecycle.test.tsx`, `tests/pdf/pdfViewer.route.test.ts`
  - Why bucket A: isolated render/session contract with strong existing test coverage
- `src/screens/office/officeHub.sections.tsx` + `src/screens/office/OfficeHubScreen.tsx`
  - Domain: office invite/access owner boundary
  - Real blockers: nullable `inviteHandoff`, nullable `Promise<... | undefined>` drift, optional layout callback mismatch
  - Blast radius: 2 runtime files
  - Focused proof support: `src/screens/office/OfficeHubScreen.test.tsx` plus office route/access tests
  - Why bucket A: still narrow, good process/control value, strong regression coverage
- `src/screens/profile/profile.services.ts`
  - Domain: profile save transport boundary
  - Real blocker: overload mismatch caused by nullable profile transport field
  - Blast radius: 1 runtime file
  - Focused proof support: `src/screens/profile/profile.services.test.ts`
  - Why bucket A: isolated boundary with clear normalization target
- `src/screens/director/DirectorDashboard.tsx`
  - Domain: director dashboard render-input boundary
  - Real blocker: invoking an optional callback without a strict guard
  - Blast radius: 1 runtime file
  - Focused proof support: no dedicated dashboard test file found
  - Why bucket A: technically isolated, but lower process value than office/pdf/profile candidates

## Bucket B — shared blockers but containable

- `src/screens/buyer/hooks/useBuyerRfqPrefill.ts` + `src/screens/buyer/useBuyerDocuments.ts` + `src/screens/buyer/useBuyerProposalAttachments.ts`
  - Domain: buyer owner/helper loading boundary
  - Real blockers: nullable request ids and `unknown -> BusyLike` drift
  - Blast radius: 3 runtime files
  - Assessment: still containable, but weaker test support than the top bucket-A slices
- `src/screens/foreman/**` draft lifecycle / recovery cluster
  - Domain: foreman state/recovery contracts
  - Real blockers: nullable `snapshot` flow, local draft rehydration contracts, lifecycle plans returning nullable snapshots
  - Blast radius: 10 files in one domain
  - Assessment: same-domain and meaningful, but now large enough to require a dedicated domain program rather than a quick next slice
- `src/screens/warehouse/**` action + PDF regression cluster
  - Domain: warehouse process boundary and test regression surface
  - Real blockers: optional scroll handlers plus many `never`-typed regression assertions
  - Blast radius: 6 files, mostly tests
  - Assessment: containable, but not the best next value because test cleanup dominates the remaining work
- `src/screens/contractor/**` search / work progress cluster
  - Domain: contractor transport and submit flow boundary
  - Real blockers: nullable row/search availability, `(string | null | undefined)[]` transport arrays, nullable work-modal submit row
  - Blast radius: 5 runtime files
  - Assessment: still domain-bounded, but wider than the top bucket-A candidates

## Bucket C — cross-domain blast radius

- `src/features/ai/aiAnalyticInsights.ts` + `src/features/ai/assistantActions.ts`
  - Domain: AI assistant/search contract layer
  - Real blockers: nullable search/result contracts and `RikQuickSearchItem` shape drift
  - Cross-domain dependency: shared quick-search item contracts and AI feature consumers
  - Why bucket C: not a good narrow slice without touching shared feature contracts
- `src/lib/api/buyer.ts` + `src/lib/api/director.ts` + remaining director PDF API tests
  - Domain: shared transport normalization/API contracts
  - Real blockers: `string | null` vs `string | undefined` transport drift plus residual API test contract drift
  - Cross-domain dependency: buyer, director, and shared API callers
  - Why bucket C: small error count but shared ownership and callers increase blast radius

## Bucket D — requires global readiness plan

- `src/lib/offline/mutationQueue.ts` + `src/lib/offline/contractorProgressQueue.ts`
  - Domain: offline queue core lifecycle
  - Real blockers: 61 strict errors, mostly `never`-collapse around lifecycle/status records
  - Runtime danger: high
  - Why bucket D: shared offline core with high process criticality; not a safe “just do next phase” candidate
- `scripts/**` verification/runtime observability cluster
  - Domain: verification scripts, realtime/runtime probes, observability capture
  - Real blockers: 201 strict errors across 35 files
  - Runtime danger: low for production execution, high for global strict readiness because root config currently includes them
  - Why bucket D: the cluster is too broad for a narrow rollout and must be planned at program level
- Root strict compile surface (`tsconfig.json`)
  - Domain: tooling / compile boundary
  - Structural blocker: one root include surface currently mixes app runtime, tests, and scripts
  - Why bucket D: future global strict rollout needs an explicit readiness plan for this coupling, not another local slice

## Safe-next shortlist

1. Office hub invite/access boundary
2. PDF viewer session boundary
3. Profile save transport boundary
4. Director dashboard callback boundary

## Dangerous shortlist

1. Offline queue core lifecycle
2. Verification/runtime scripts observability cluster
3. Foreman draft lifecycle and recovery
4. Shared API null contract drift

## What stayed out of scope

- no runtime fixes
- no `strictNullChecks` config changes
- no test rewrites
- no script cleanup
- no SQL changes
- no app behavior changes
