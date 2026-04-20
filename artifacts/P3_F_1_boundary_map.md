# P3-F.1 Boundary Map

## Baseline

- `main == origin/main` at `4975110`.
- Worktree was clean before opening P3-F.
- P3-A is already GREEN and OTA-published.
- This wave does not reopen N1.SEC1, P3-A, SQL, DB, PDF, Buyer, Office, AI, or broad Foreman flows.

## Current Shape

`src/screens/foreman/hooks/useForemanDraftBoundary.ts` is already partially decomposed by prior waves:

- lifecycle decisions live in `foreman.draftLifecycle.model.ts`;
- sync queue decisions live in `foreman.draftSyncPlan.model.ts`;
- manual recovery decisions live in `foreman.manualRecovery.model.ts`;
- post-submit decisions live in `foreman.postSubmitDraftPlan.model.ts`;
- bootstrap execution is isolated in `hooks/useForemanBootstrapCoordinator.ts`;
- identity/load-effect decisions live in `foreman.draftBoundaryIdentity.model.ts`.

The remaining low-risk root seam is the mixed draft state/header edit area:

- active local draft and draft-like status combine into root-level activity flags;
- header edits directly mix UI setters with request-details patch decisions;
- object type selection includes cascading level/system/zone resets in the root hook.

## P3-F Main Seam

Extend the existing permanent Foreman boundary model `foreman.draftBoundaryIdentity.model.ts` for:

- draft activity state (`hasLocalDraft`, `isDraftActive`);
- header edit plans for foreman/comment/object/level/system/zone;
- request-details patch application for those header edit plans.

## What Stays In `useForemanDraftBoundary.ts`

- React hook wiring and hook order;
- refs and state ownership;
- network, queue, durable store, and telemetry side effects;
- submit/offline/recovery execution;
- bootstrap coordinator wiring;
- runtime composition returned to `useForemanScreenController`.

## What Moves Out Of The Root Hook

- pure draft activity derivation;
- pure header edit branch selection;
- pure request-details patch dispatch for header edits.

## Non-Goals

- No business logic changes.
- No offline semantics changes.
- No remote truth or submit semantics changes.
- No UI flow changes.
- No new temporary hook, VM, or adapter.
- No broad Foreman refactor.
