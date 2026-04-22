## Wave

`FOREMAN_DRAFT_OWNER_SPLIT_FINAL`

## Initial ownership map

`src/screens/foreman/hooks/useForemanDraftBoundary.ts` initially mixed these responsibilities in one hook:

- local snapshot ownership and owner-readable derived state
- durable recovery refresh and request synchronization orchestration
- request-details load sequencing and invalidation
- post-submit cleanup and reopen/reset orchestration
- failure reporting and manual-recovery telemetry
- live cleanup effect execution
- remote details/items effect execution
- React effect wiring and subscription cleanup
- UI-facing boundary contract assembly

## Exact extracted modules in this wave

- `src/screens/foreman/foreman.draftBoundary.requestDetails.ts`
  Owns request-details load sequencing and invalidation.
- `src/screens/foreman/foreman.draftBoundary.telemetry.ts`
  Owns failure reporting and recovery telemetry side-effect boundary while reusing existing pure planners.
- `src/screens/foreman/foreman.draftBoundary.postSubmit.ts`
  Owns post-submit orchestration while reusing the existing post-submit plan layer.
- `src/screens/foreman/foreman.draftBoundary.effects.ts`
  Owns live cleanup effect execution and remote details/items effect execution.

## What remained in the hook

`useForemanDraftBoundary.ts` remains the orchestration owner for:

- React state, refs, and lifecycle wiring
- boundary-level callbacks passed to the screen
- sync/recovery action sequencing
- local snapshot apply/reset wrappers
- queue-key accessors and existing domain entrypoints
- final owner-facing return contract

## Why business semantics did not change

- Existing pure planning layers were reused rather than rewritten.
- Submit, recovery, restore, and durable draft semantics were not moved into new business logic.
- Extracted modules only took over boundaries that were already deterministically driven by existing plan/model helpers.
- Tests were updated so source-order and decomposition assertions now point to the new owners instead of the hook body.

## Intentional non-scope

- no submit pipeline changes
- no queue worker changes
- no RPC or SQL changes
- no durable draft schema changes
- no UI redesign or flow changes
- no neighboring foreman domain cleanup outside exact boundary scope
