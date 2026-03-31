# Wave 8: Test Governance

## Goal
- Keep existing verification gates reproducible and discoverable.
- Stop future waves from relying on memory or ad-hoc command selection.
- Do this without changing product logic or test semantics.

## Rules
1. Every improvement wave must declare:
   - one exact static gate
   - one exact touched-scope Jest/test gate when code moves or contracts change
   - one exact runtime proof command when UI/runtime behavior changes
2. `verify:typecheck` is the mandatory base gate for every code wave.
3. No wave is `GREEN` without runnable commands or an explicit host/environment blocker.
4. Runtime blockers must be classified honestly:
   - `PRODUCT_BLOCKED`
   - `HARNESS_BLOCKED`
   - `HOST_BLOCKED`
5. New proof artifacts must use `artifacts/waveN-*` naming or clearly family-scoped names already established by the repo.
6. Do not replace touched-scope tests with screenshots or manual claims.
7. Do not broaden governance into package surgery or feature refactors.

## Canonical Static Entry Points
- `npm run verify:typecheck`
- `npm run verify:wave3-offline-core`
- `npm run verify:wave4-profile-static`
- `npm run verify:wave6-pdf`
- `npm run verify:wave7-perf`
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
- `verify:governance:static`
  Scope: aggregate static wave gate

### Runtime
- `verify:wave4-profile-runtime`
  Scope: web/android profile runtime closure
  Note: iOS remains host-dependent and must stay explicit
- `verify:local-role-smoke`
  Scope: local web role-screen access smoke

## Usage Discipline
- If a wave touches only docs/tests/governance, static gates are sufficient.
- If a wave touches UI/runtime code, the final report must include the exact runtime command and artifacts.
- If a wave touches a previously governed area, extend the existing script rather than inventing a new ad-hoc one unless the contract is genuinely different.
