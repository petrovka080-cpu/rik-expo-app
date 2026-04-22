# STRICT_NULLCHECKS_PHASE_12 Proof

## Probe Result

- Fresh strict-null inventory was collected from `npx tsc --noEmit --pretty false --strictNullChecks`.
- Shortlist outcome:
  - Candidate A `src/screens/director/DirectorDashboard.tsx` -> safe, lower value
  - Candidate B `src/screens/office/OfficeHubScreen.tsx` -> blocked by remaining shared dependencies
  - Candidate C `src/screens/foreman/foreman.draftLifecycle.model.ts` -> too wide
  - Candidate D `src/screens/accountant/accountant.inbox.service.ts` -> chosen

## Before Blocker

- `src/screens/accountant/accountant.inbox.service.ts(136)`:
  - `normalizeAccountantInboxRpcTab(tab)` returned `string | null`
  - `accountant_inbox_scope_v1` expects `Args: { p_tab?: string; p_offset?: number; p_limit?: number }`
  - the service leaked `null` into a typed optional-string RPC boundary

## After Blocker

- `src/screens/accountant/accountant.inbox.service.ts` now exposes an explicit boundary contract:
  - `resolveAccountantInboxRpcTabContract`
  - `buildAccountantInboxScopeRpcArgs`
- The inbox RPC boundary now behaves deterministically:
  - `ready` -> send normalized `p_tab`
  - `missing` -> omit `p_tab`
  - `p_offset` and `p_limit` remain clamped at the boundary
- Additional boundary hardening inside the same exact scope:
  - malformed inbox payloads no longer truthy-coerce `has_invoice`
  - invalid non-boolean `has_invoice` now normalizes to `false`

## Compile Proof

- `npx tsc --project tsconfig.strict-null-phase12-accountant-inbox-window.json --pretty false` - PASS
- `npx tsc --noEmit --pretty false` - PASS

## Regression Proof

- Focused slice tests:
  - `npx jest src/screens/accountant/accountant.windowing.service.test.ts --runInBand --no-coverage` - PASS
- Added focused coverage for:
  - valid tab -> ready RPC contract
  - empty / undefined tab -> missing contract with omitted `p_tab`
  - partial / malformed inbox payload -> deterministic normalization without false rows
- Full serial suite:
  - `npm test -- --runInBand` - PASS
- Full default suite:
  - `npm test` - PASS

## Unchanged Runtime Semantics

- Valid accountant tabs still normalize to the same RPC `p_tab` values as before.
- The inbox success path remains unchanged for valid input:
  - same RPC owner
  - same returned rows
  - same meta/result structure
  - same fallback policy (`fallbackUsed: false`)
- The only runtime change is at the malformed or missing-input boundary:
  - missing tab now omits `p_tab` instead of sending `null`
  - malformed non-boolean `has_invoice` no longer masquerades as `true`
- No business logic, permissions, role behavior, network semantics, or success-path output changed for valid input.

## Full Gates

- `npx expo lint` - PASS
- `git diff --check` - PASS

## Release Rule

- Runtime TS changed in `src/screens/accountant/accountant.inbox.service.ts`
- OTA is required if the wave reaches GREEN
