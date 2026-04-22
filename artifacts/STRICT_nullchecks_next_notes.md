# STRICT_NULLCHECKS_NEXT_EXECUTION_WAVE Notes

## Shortlist Probe

- Candidate A - director dashboard callback boundary (`src/screens/director/DirectorDashboard.tsx`)
  - Domain: director
  - Boundary type: process / render-input
  - Real strict-null blocker:
    - `scrollToOffset` invocation on an optional list-ref method
  - Blast radius: one runtime file
  - Cross-domain dependencies: none after isolated probe
  - Focused tests: observability coverage exists, but dedicated behavior proof is weaker
  - Process/control value: lower than a transport-write boundary
  - Verdict: safe, lower value

- Candidate B - office access orchestration (`src/screens/office/OfficeHubScreen.tsx`)
  - Domain: office
  - Boundary type: process / state
  - Real strict-null blockers:
    - `Promise<OfficeAccessScreenData | null | undefined>` drift on access loading paths
  - Blast radius: narrow in the file, but strict compile still fans into `profile.services`
  - Cross-domain dependencies: `officeAccess.services -> profile.services`
  - Focused tests: yes
  - Process/control value: good
  - Verdict: blocked by cross-domain deps

- Candidate C - foreman lifecycle and recovery cluster
  - Domain: foreman
  - Boundary type: lifecycle / recovery
  - Real strict-null blockers:
    - nullable snapshot lifecycle and recovery drift across multiple owner files
  - Blast radius: wide
  - Cross-domain dependencies: same-domain owner coupling, but too many files for a narrow wave
  - Focused tests: yes
  - Process/control value: high
  - Verdict: too wide

- Candidate D - profile listing transport boundary (`src/screens/profile/profile.services.ts`)
  - Domain: profile / add-listing
  - Boundary type: transport / process
  - Real strict-null blocker:
    - `market_listings.insert` rejected `kind: ListingKind | "mixed" | null`
  - Blast radius: one runtime file plus focused tests
  - Cross-domain dependencies: none after isolated probe with `tsconfig.strict-null-next-profile-listing.json`
  - Focused tests: yes, `src/screens/profile/profile.services.test.ts`
  - Process/control value: high because it hardens the create-listing write contract
  - Verdict: chosen

## Why This Slice

- It is isolated under a dedicated strict config with one real blocker in the chosen runtime file.
- It hardens a write boundary instead of a purely cosmetic callback surface.
- It makes the `market_listings` insert contract deterministic:
  - `missing` kind is omitted from the payload
  - valid explicit kind stays explicit
  - mixed cart kinds stay `mixed`
  - malformed explicit kind is rejected at the boundary
- The slice improves process control without changing valid success semantics.

## Out Of Scope

- `src/screens/director/DirectorDashboard.tsx`
- `src/screens/office/OfficeHubScreen.tsx`
- foreman lifecycle/recovery
- AI/shared API null-contract drift
- global `strictNullChecks` enablement
- Promise/RLS waves

## Real Blockers Closed

- `market_listings.insert` no longer receives a nullable `kind` field from the profile listing flow.
- The create-listing transport boundary now distinguishes `missing`, `invalid`, and `ready`.
- Cart item `kind` values are normalized before they enter `items_json`.
- The focused profile service suite now proves missing, mixed, explicit, partial, malformed, and invalid kind paths.

## Scalability / Control Value

- The insert payload now matches the database contract exactly, which removes a hidden nullable write-path risk.
- The profile listing flow now has a deterministic transport contract that is easier to extend without widening strict scope later.
