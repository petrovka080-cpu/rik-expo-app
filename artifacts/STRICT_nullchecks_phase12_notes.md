# STRICT_NULLCHECKS_PHASE_12 Notes

## Shortlist Probe

- Candidate A - `src/screens/director/DirectorDashboard.tsx`
  - Domain: director render-input boundary
  - Entry path: `DirectorDashboard`
  - Real blocker: optional `scrollToOffset` invocation on the top-tab list ref
  - Boundary type: render-input
  - Blast radius: one file
  - Focused tests: indirect only
  - Verdict: safe, but lower process value

- Candidate B - `src/screens/office/OfficeHubScreen.tsx`
  - Domain: office bootstrap boundary
  - Entry path: `OfficeHubScreen`
  - Real blockers: `Promise<OfficeAccessScreenData | null | undefined>` leaking into a `Promise<OfficeAccessScreenData | null>` contract
  - Boundary type: process/bootstrap
  - Blast radius: screen + service path
  - Cross-domain dependency: `officeAccess.services`
  - Focused tests: yes
  - Verdict: blocked by remaining shared dependencies

- Candidate C - `src/screens/foreman/foreman.draftLifecycle.model.ts`
  - Domain: foreman draft lifecycle / recovery
  - Entry path: `foreman.draftLifecycle.model`
  - Real blockers: nullable snapshot state leaking into lifecycle plan contracts
  - Boundary type: state/process/recovery
  - Blast radius: multi-file shared cluster (`draftLifecycle`, `localDraft`, `manualRecovery`, helpers)
  - Focused tests: yes
  - Verdict: too wide for one narrow rollout slice

- Candidate D - `src/screens/accountant/accountant.inbox.service.ts`
  - Domain: accountant inbox RPC boundary
  - Entry path: `loadAccountantInboxWindowData`
  - Real blocker: `normalizeAccountantInboxRpcTab(tab)` returns `string | null` while `accountant_inbox_scope_v1` expects `p_tab?: string`
  - Boundary type: transport / process-contract / route-input
  - Blast radius: one service file with one focused test file
  - Focused tests: `src/screens/accountant/accountant.windowing.service.test.ts`
  - Verdict: chosen

## Why This Slice Was Chosen

- It closes a real strict-null blocker on a runtime RPC boundary instead of a cosmetic render callback.
- The blast radius is narrow and does not require touching the adjacent accountant history flow or wider office/foreman clusters.
- The fix improves process control by making the RPC tab contract explicit:
  - `ready` -> send `p_tab`
  - `missing` -> omit `p_tab`
- Existing focused service tests already cover the success/failure path, so regression proof stays local and strong.

## Real Nullable / Boundary Blockers Closed

- `string | null` no longer leaks into the typed `accountant_inbox_scope_v1` RPC args.
- The inbox tab contract is now explicit via `resolveAccountantInboxRpcTabContract`.
- The RPC argument normalization is deterministic via `buildAccountantInboxScopeRpcArgs`.
- Malformed inbox envelope payloads no longer truthy-coerce `has_invoice`; invalid non-boolean values now normalize to `false`.

## What Was Intentionally Left Out

- No office bootstrap remediation
- No foreman lifecycle prep or rollout
- No director top-tab ref cleanup
- No shared accountant API changes outside the exact inbox service slice
- No SQL / RPC semantic changes
- No global `strictNullChecks` enablement
