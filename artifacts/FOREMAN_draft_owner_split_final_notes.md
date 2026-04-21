## FOREMAN_DRAFT_OWNER_SPLIT_FINAL

### Scope
- Exact boundary only: [src/screens/foreman/hooks/useForemanDraftBoundary.ts](/C:/dev/rik-expo-app/src/screens/foreman/hooks/useForemanDraftBoundary.ts)
- New extracted modules:
  - [src/screens/foreman/foreman.draftBoundary.plan.ts](/C:/dev/rik-expo-app/src/screens/foreman/foreman.draftBoundary.plan.ts)
  - [src/screens/foreman/foreman.draftBoundary.apply.ts](/C:/dev/rik-expo-app/src/screens/foreman/foreman.draftBoundary.apply.ts)
  - [src/screens/foreman/foreman.draftBoundary.recovery.ts](/C:/dev/rik-expo-app/src/screens/foreman/foreman.draftBoundary.recovery.ts)
  - [src/screens/foreman/foreman.draftBoundary.sync.ts](/C:/dev/rik-expo-app/src/screens/foreman/foreman.draftBoundary.sync.ts)
- Focused exact-scope tests:
  - [tests/foreman/foreman.draftBoundary.plan.test.ts](/C:/dev/rik-expo-app/tests/foreman/foreman.draftBoundary.plan.test.ts)
  - [tests/foreman/foreman.draftBoundary.apply.test.ts](/C:/dev/rik-expo-app/tests/foreman/foreman.draftBoundary.apply.test.ts)
  - [tests/foreman/foreman.draftBoundary.recovery.test.ts](/C:/dev/rik-expo-app/tests/foreman/foreman.draftBoundary.recovery.test.ts)
  - [tests/foreman/foreman.draftBoundary.decomposition.test.ts](/C:/dev/rik-expo-app/tests/foreman/foreman.draftBoundary.decomposition.test.ts)

### Initial Ownership Map
- `useForemanDraftBoundary.ts` previously mixed:
  - local snapshot ownership
  - durable recovery ownership
  - restore and terminal planning
  - refresh and reconcile planning
  - React effect wiring
  - state commit and apply behavior
  - queue-facing coordination
  - telemetry and failure classification
  - UI-facing derived state
- This left the boundary in a partial state after the earlier helper extraction wave: critical recovery, sync, and derived-state ownership were still anchored inside the hook.

### What Was Extracted
- `foreman.draftBoundary.plan.ts`
  - derived header state
  - derived view state
  - persist plan
  - remote-effects plan
  - live cleanup plan
  - item edit eligibility
- `foreman.draftBoundary.apply.ts`
  - pure header edit application into boundary setters plus request-details patching
- `foreman.draftBoundary.recovery.ts`
  - terminal cleanup owner
  - recovery-owner cleanup
  - restore attempt owner
  - restore trigger owner
  - remote rehydrate owner
  - local restore/discard/open/discard-whole owners
- `foreman.draftBoundary.sync.ts`
  - sync-now owner
  - retry-now owner
  - failed-queue-tail cleanup owner

### What Stayed In The Hook
- Input gathering from route, draft stores, and other foreman hooks
- Stable React callback wiring
- Effect execution points
- State commits through existing React setters/refs
- Public hook contract to screens and callers

### Why Semantics Stayed Unchanged
- Submit semantics are unchanged.
- Durable recovery semantics are unchanged.
- Queue/mutation worker semantics are unchanged.
- Draft model shape is unchanged.
- RPC and backend behavior are unchanged.
- The hook still owns orchestration order; only pure planning/apply/recovery/sync responsibilities moved out.
- Existing regression suites for terminal cleanup, restore, sync, modal-aware flow, and duplicate protection remained green.

### Exact Auto-Fixes Completed In Scope
- Removed exact-scope unused-setter suppression from the hook by narrowing destructuring instead of keeping an `eslint-disable`.
- Fixed an accidental self-recursion risk in the extracted plan layer by aliasing the imported header-state builder.
- Tightened exact touched tests so the split is guarded structurally rather than by file size alone.
- No `as any`, `@ts-ignore`, `eslint-disable`, or silent `catch {}` remain in touched runtime files.

### Intentionally Not Touched
- Mutation worker internals
- Offline queue semantics
- RPC/backend contracts
- Draft schema
- Neighboring role flows
- Broad foreman screen/UI refactors

### Residual Risk Kept Out Of Scope
- A harmless mojibake comment fragment remains in `useForemanDraftBoundary.ts`. It does not affect runtime, typing, lint, or tests and was not used as a justification to widen this wave.
