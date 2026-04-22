# STRICT_NULLCHECKS_PHASE_11 Proof

## Probe Result

- The shortlist was re-run after Phase 10.
- Result:
  - PDF viewer session boundary - prepared and safe
  - director dashboard tabs scroll boundary - safe but weaker value
  - office screen orchestration - blocked by remaining shared deps
  - foreman lifecycle/recovery - too wide

## Prep / Blast-Radius Proof

- The chosen slice is now narrow because the route/snapshot/bootstrap contract already lives outside the screen:
  - `resolvePdfViewerRouteModel`
  - `resolvePdfViewerSnapshot`
  - `planPdfViewerLoadingTransition`
- A dedicated strict probe containing only `app/pdf-viewer.tsx` produced exactly three local nullable blockers and no cross-domain compile fan-out.
- That is the proof that the previous boundary work already reduced this slice to a production-safe strict rollout.

## Before Blockers

- `app/pdf-viewer.tsx(700)` - `next.session` possibly null in loading transition
- `app/pdf-viewer.tsx(1083)` - `next.session` possibly null inside async open logging
- `app/pdf-viewer.tsx(1195)` - `next.session` possibly null inside web iframe readiness logging

## After Blockers

- `enterLoading` now exits through the existing empty-state path if `syncSnapshot()` returns no session.
- The open/handoff path captures `activeSession` immediately after the existing null guard and reuses that deterministic contract through readiness resolution and logging.

## Compile Proof

- `npx tsc --project tsconfig.strict-null-phase11-pdf-viewer-session.json --pretty false` - PASS
- `npx tsc --noEmit --pretty false` - PASS

## Regression Proof

- Focused lifecycle regression:
  - `npm test -- --runInBand tests/routes/pdf-viewer.lifecycle.test.tsx` - PASS
- Added exact missing-session proof:
  - when route params contain a session id but the registry has no session, the viewer does not call `touchDocumentSession`
  - it also does not falsely mark the open as visible/successful
- Existing valid success path remains green:
  - stable remote-url open cycle
  - stale iframe load suppression
  - ready-state logging and observability flow

## Full Gates

- `npx expo lint` - PASS
- `npm test -- --runInBand` - PASS
- `npm test` - PASS
- `git diff --check` - PASS

## Unchanged Runtime Semantics

- Valid session success-path is unchanged.
- Direct-route/ready PDF behavior is unchanged.
- Missing-session behavior is unchanged in meaning: it still resolves to the empty path.
- The phase only removed unsafe dereference risk on the missing-session boundary; it did not change business logic, permissions, network semantics, or output on valid input.
