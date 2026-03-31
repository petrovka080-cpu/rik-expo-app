# Wave 8: Test Governance

## Goal
- Keep verification gates reproducible and discoverable.
- Prevent new test debt in critical areas from growing without a regression barrier.
- Do this without changing product logic or inventing coverage theatre.

## Coverage Policy
- Coverage collection is enabled through the dedicated governance gate:
  - `npm run verify:wave8-coverage`
- Coverage scope is intentionally bounded to already-governed critical modules:
  - offline queue/worker core
  - profile critical extracted logic
- Thresholds are realistic and enforceable for the bounded critical set:
  - statements: `60`
  - branches: `40`
  - functions: `70`
  - lines: `60`
- Coverage is not used as a repo-wide vanity metric.
- Low per-file coverage inside the governed set is a signal for future test debt reduction, not a reason to fake broad numbers with snapshots.

## Mandatory-Test Zones

### 1. Offline core
- Files/families:
  - `src/lib/offline/mutationQueue.ts`
  - `src/lib/offline/mutationWorker.ts`
  - `src/lib/offline/mutation.retryPolicy.ts`
  - `src/lib/offline/mutation.conflict.ts`
- Why mandatory:
  - queue/worker regressions break retry, dedupe, conflict and stuck-recovery behavior across the product.
- Minimum proof when touched:
  - targeted Jest/contract suite
  - coverage gate

### 2. Draft / orchestration-critical foreman behavior
- Files/families:
  - `src/screens/foreman/hooks/useForemanDraftBoundary.ts`
  - `src/screens/foreman/foreman.draftBoundary.helpers.ts`
  - `src/screens/foreman/foreman.localDraft.*`
- Why mandatory:
  - restore/sync/submit-support failures can silently corrupt draft truth.
- Minimum proof when touched:
  - targeted Jest
  - typed handling / observability proof
  - runtime smoke if orchestration semantics change

### 3. Profile critical behavior
- Files/families:
  - `src/screens/profile/profile.services.ts`
  - `src/screens/profile/hooks/useProfileDerivedState.ts`
  - `src/screens/profile/components/ProfilePrimitives.tsx`
  - `scripts/profile_stabilization_verify.ts`
- Why mandatory:
  - profile is user-facing, modal-heavy and cross-platform.
- Minimum proof when touched:
  - targeted Jest
  - web/android runtime proof
  - iOS proof or explicit host blocker

### 4. DB/RPC contract adapters
- Files/families:
  - `src/lib/api/queryBoundary.ts`
  - `src/lib/api/directorPdfBackendInvoker.ts`
  - `src/lib/api/directorPdfRender.service.ts`
  - `src/lib/api/pdf_director.ts`
- Why mandatory:
  - adapter drift can break contract boundaries without obvious UI failures.
- Minimum proof when touched:
  - targeted adapter/unit tests
  - exact caller/runtime proof when fallback or version routing changes

### 5. PDF / report orchestration
- Files/families:
  - `src/lib/pdf/pdf.director.templates.ts`
  - `src/lib/pdf/pdf.warehouse.ts`
  - `src/lib/documents/pdfRpcRollout.ts`
  - `src/lib/documents/pdfRenderRollout.ts`
  - viewer/open contract files
- Why mandatory:
  - rollout/fallback regressions surface as broken document generation or open flow.
- Minimum proof when touched:
  - targeted Jest
  - family-specific smoke/runtime proof

## Required Proof Rules
1. Every improvement wave must declare:
   - one exact static gate
   - one exact touched-scope Jest/test gate when code moves or contracts change
   - one exact runtime proof command when UI/runtime behavior changes
2. `verify:typecheck` is the mandatory base gate for every code wave.
3. No wave is `GREEN` without runnable commands or an explicit blocker.
4. Blockers must be classified honestly:
   - `PRODUCT_BLOCKED`
   - `HARNESS_BLOCKED`
   - `HOST_BLOCKED`
5. New proof artifacts must use `artifacts/waveN-*` naming or clearly family-scoped names already established by the repo.

## Canonical Static Entry Points
- `npm run verify:typecheck`
- `npm run verify:wave3-offline-core`
- `npm run verify:wave4-profile-static`
- `npm run verify:wave6-pdf`
- `npm run verify:wave7-perf`
- `npm run verify:wave8-coverage`
- `npm run verify:governance:static`

## Canonical Runtime Entry Points
- `npm run verify:wave4-profile-runtime`
- `npm run verify:local-role-smoke`

## Current Registry

### Static
- `verify:typecheck`
  Scope: repository compile gate
- `verify:wave3-offline-core`
  Scope: offline queue/worker contract barrier
- `verify:wave4-profile-static`
  Scope: profile extracted services/hooks/components
- `verify:wave6-pdf`
  Scope: PDF layer decomposition public surface
- `verify:wave7-perf`
  Scope: performance/bundle tightening helpers
- `verify:wave8-coverage`
  Scope: bounded critical-zone coverage gate
- `verify:governance:static`
  Scope: aggregate static wave gate

### Runtime
- `verify:wave4-profile-runtime`
  Scope: web/android profile runtime closure
  Note: iOS remains host-dependent and must stay explicit
- `verify:local-role-smoke`
  Scope: local web role-screen access smoke

## Minimal Runtime / E2E Direction

### Web
- Required when a change touches user-visible critical screens, PDF open flows, or orchestration that can break navigation/render truth.
- Acceptable proof:
  - exact runtime verifier or deterministic smoke script
  - no runtime crash
  - key modal/action path verified when applicable

### Android
- Required when a change touches cross-platform user-visible behavior or native-sensitive flows.
- Acceptable proof:
  - emulator/dev-client smoke
  - exact distinction between harness issue and product regression

### iOS
- Required on supported host when the change affects cross-platform runtime behavior.
- If the current host cannot run iOS runtime proof, final status must explicitly say `HOST_BLOCKED`.
- iOS may not be silently assumed green because Expo/web/android are green.

## Forbidden Shortcuts
- Snapshot spam used only to inflate coverage
- manual “looks fine” without exact command/artifact
- silent downgrade from runtime proof to screenshots
- fake repo-wide coverage claims that hide low-value untested critical logic
- changing product code only to make coverage numbers prettier

## Usage Discipline
- If a wave touches only docs/tests/governance, static gates are sufficient.
- If a wave touches UI/runtime code, the final report must include the exact runtime command and artifacts.
- If a wave touches a previously governed area, extend the existing script rather than inventing a new ad-hoc one unless the contract is genuinely different.
