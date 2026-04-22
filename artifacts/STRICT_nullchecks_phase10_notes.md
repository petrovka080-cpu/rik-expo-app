# STRICT_NULLCHECKS_PHASE_10 Notes

## Shortlist Probe

- Candidate A — office presenter invite/access boundary (`src/screens/office/officeHub.sections.tsx`)
  - Domain: office
  - Boundary type: presenter/render-input + invite handoff access boundary
  - Real strict-null blockers:
    - `invite.inviteHandoff` was read inside action closures after a nullable branch check
    - `SectionLayout` returned `LayoutHandler | undefined`, but `OfficeCompanyCreateSection` required non-optional layout handlers
    - presenter file depended on hook `ReturnType<>` contracts, which widened the strict compile blast radius into owner/service files
  - Blast radius: 2 production files + 1 focused test + 1 phase config
  - Cross-domain deps: containable after removing hook-return-type coupling
  - Focused tests: yes (`src/screens/office/OfficeHubScreen.test.tsx`, `src/screens/office/officeHub.companyCreateSection.test.tsx`)
  - Verdict: safe

- Candidate B — office screen load/orchestration contract (`src/screens/office/OfficeHubScreen.tsx`)
  - Domain: office
  - Boundary type: process/orchestration
  - Real strict-null blocker: `Promise<... | undefined>` drift from `finally` return paths
  - Blast radius: narrow in file, but strict compile still drags `officeAccess.services -> profile.services`
  - Cross-domain deps: yes
  - Focused tests: yes
  - Verdict: blocked by service-coupled import graph for this wave

- Candidate C — PDF viewer session boundary (`app/pdf-viewer.tsx`)
  - Domain: pdf viewer
  - Boundary type: session/process
  - Real strict-null blockers: `next.session` possibly null on multiple critical paths
  - Blast radius: giant owner file (~57 KB) with broad session lifecycle ownership
  - Cross-domain deps: medium
  - Focused tests: yes
  - Verdict: too wide for the next narrow production-safe wave

- Candidate D — foreman draft lifecycle/recovery cluster
  - Domain: foreman
  - Boundary type: process/recovery
  - Real strict-null blockers: many `snapshot` nullability violations across multiple lifecycle/recovery files
  - Blast radius: wide owner/shared cluster
  - Cross-domain deps: high
  - Focused tests: yes
  - Verdict: too wide, still prep/split territory

## Chosen Slice

- Chosen wave: `STRICT_NULLCHECKS_PHASE_10`
- Chosen slice: office presenter invite/access boundary
- Exact production files:
  - `src/screens/office/officeHub.sections.tsx`
  - `src/screens/office/officeHub.companyCreateSection.tsx`
- Focused changed-file test:
  - `src/screens/office/officeHub.companyCreateSection.test.tsx`
- Phase config:
  - `tsconfig.strict-null-phase10-office-invite-access.json`

## Why This Slice

- It has real strict-null blockers.
- It is already boundary-prepared by earlier office split waves.
- The blast radius is narrow after removing `ReturnType<>` coupling to owner hooks.
- It strengthens the invite/access presenter contract without touching business logic, SQL, RPC, or role semantics.
- Existing office regression coverage already proves the success path for web handoff, copy actions, and company-create rendering.

## Explicitly Out Of Scope

- `src/screens/office/OfficeHubScreen.tsx` orchestration strict blocker
- `app/pdf-viewer.tsx` session boundary
- foreman lifecycle/recovery cluster
- shared API / AI transport null-contract drift
- any global `strictNullChecks` enablement

## Real Nullable / Strict Blockers Closed

- Invite handoff action closures now read from a captured non-null handoff contract instead of reopening a nullable property path.
- Company-create presenter contract now correctly allows omitted layout handlers when post-return tracing disables layout callbacks.
- Presenter boundary no longer imports owner hook return types just to describe props, which prevents this strict probe from pulling unrelated service-layer contracts into the slice.
