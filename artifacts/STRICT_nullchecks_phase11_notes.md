# STRICT_NULLCHECKS_PHASE_11 Notes

## Shortlist Probe

- Candidate A - PDF viewer session boundary (`app/pdf-viewer.tsx`)
  - Domain: pdf viewer
  - Entry / owner path: `app/pdf-viewer.tsx`
  - Remaining strict-null blockers:
    - `next.session` possibly null in `enterLoading`
    - `next.session` reused inside async open/handoff logging after a nullable gate
  - What was already prepared:
    - route/snapshot normalization already lives in `src/lib/pdf/pdfViewer.route.ts`
    - bootstrap plan already distinguishes `missing-session` vs ready/handoff paths
    - lifecycle regression coverage already exists in `tests/routes/pdf-viewer.lifecycle.test.tsx`
  - Blast radius: one runtime file + one focused lifecycle test + one phase config
  - Focused tests: yes
  - Process/control value: high
  - Verdict: prepared and safe

- Candidate B - director dashboard top-tabs scroll boundary (`src/screens/director/DirectorDashboard.tsx`)
  - Domain: director
  - Entry / owner path: `src/screens/director/DirectorDashboard.tsx`
  - Remaining strict-null blocker:
    - optional `scrollToOffset` invocation on a loosely typed list ref
  - What was already prepared:
    - director lifecycle/report boundaries already have focused tests
  - Blast radius: narrow
  - Focused tests: yes
  - Process/control value: weak compared with PDF session boundary
  - Verdict: safe but lower-value

- Candidate C - office screen orchestration (`src/screens/office/OfficeHubScreen.tsx`)
  - Domain: office
  - Entry / owner path: `src/screens/office/OfficeHubScreen.tsx`
  - Remaining strict-null blockers:
    - `Promise<... | undefined>` drift from `finally` cleanup paths
  - What was already prepared:
    - office presenter/access boundary was closed in Phase 10
  - Blast radius: narrow in file, but strict compile still drags `officeAccess.services -> profile.services`
  - Focused tests: yes
  - Process/control value: good, but still blocked by shared deps
  - Verdict: blocked by remaining shared dependencies

- Candidate D - foreman lifecycle/recovery cluster
  - Domain: foreman
  - Entry / owner path:
    - `src/screens/foreman/foreman.draftLifecycle.model.ts`
    - `src/screens/foreman/foreman.manualRecovery.model.ts`
  - Remaining strict-null blockers:
    - nullable snapshot lifecycle/recovery drift across multiple files
  - What was already prepared:
    - earlier decomposition exists, but owner/lifecycle split is still incomplete
  - Blast radius: wide
  - Focused tests: yes
  - Process/control value: high, but not safe for direct strict rollout
  - Verdict: too wide even now

## Chosen Slice

- Chosen wave: `STRICT_NULLCHECKS_PHASE_11`
- Chosen slice: PDF viewer session boundary
- Exact production file:
  - `app/pdf-viewer.tsx`
- Focused tests:
  - `tests/routes/pdf-viewer.lifecycle.test.tsx`
- Phase config:
  - `tsconfig.strict-null-phase11-pdf-viewer-session.json`

## Why This Slice

- It is already isolated under a dedicated strict config.
- The remaining blockers are real and local.
- It improves process control at a critical lifecycle boundary: `missing session` vs `loading/ready`.
- The existing route/bootstrap model already defines the correct empty-path semantics, so the runtime fix is guard-first rather than behavioral rewrite.
- It has strong focused lifecycle test coverage and does not require any shared API or owner-split work.

## Explicitly Out Of Scope

- `src/screens/office/OfficeHubScreen.tsx`
- `src/screens/director/DirectorDashboard.tsx`
- foreman lifecycle/recovery cluster
- shared API / AI null-contract drift
- any global `strictNullChecks` enablement

## Real Blockers Closed

- `enterLoading` now handles a missing session deterministically before touching the session registry.
- Open/handoff logging now uses a captured non-null session contract after the existing `missing session` guard.
- The focused lifecycle suite now proves that a missing registry session stays on the empty path and does not attempt to touch a null session.
