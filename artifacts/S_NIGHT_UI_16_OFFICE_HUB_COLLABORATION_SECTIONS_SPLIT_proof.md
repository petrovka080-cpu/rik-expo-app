# S_NIGHT_UI_16_OFFICE_HUB_COLLABORATION_SECTIONS_SPLIT

final_status: GREEN_OFFICE_HUB_COLLABORATION_SECTIONS_SPLIT

## Selection

Selected files:
- `src/screens/office/officeHub.sections.tsx`
- `src/screens/office/officeHub.collaborationSections.tsx`
- `tests/office/officeHubCollaborationSections.decomposition.test.ts`
- `tests/office/officeInviteHandoffSection.decomposition.test.ts`
- `tests/perf/performance-budget.test.ts`

Reason selected: `officeHub.sections.tsx` was the highest remaining transport-free presentational UI debt file by line count. Invite, members, and invite-modal sections were safe to move as a durable render boundary without changing OfficeHub controller behavior, route behavior, transport, DB, cache, or rate-limit logic.

## Before And After Metrics

Before:
- `officeHub.sections.tsx` lines: 706
- `officeHub.sections.tsx` hook calls: 0
- `officeHub.sections.tsx` imports: 14
- Dedicated collaboration-section files: 0
- Component debt god-component count: 27

After:
- `officeHub.sections.tsx` lines: 416
- `officeHub.sections.tsx` hook calls: 0
- `officeHub.sections.tsx` imports: 11
- `officeHub.collaborationSections.tsx` lines: 320
- `officeHub.collaborationSections.tsx` hook calls: 0
- Dedicated collaboration-section files: 1
- Component debt god-component count: 26

Delta:
- Sections facade lines: -290
- Sections facade imports: -3
- Component debt god-component count: -1

## Proof

- Moved `OfficeInvitesSection`, `OfficeMembersSection`, and `OfficeInviteModalSection` into `officeHub.collaborationSections.tsx`.
- Kept `officeHub.sections.tsx` as the stable public facade and re-exported the moved section components.
- Added a decomposition contract proving the facade re-export, moved component bodies, reduced line budget, and transport-free extracted module.
- Updated the invite handoff contract to check the new collaboration section owner file.
- Updated performance budget accounting for exactly one durable OfficeHub collaboration section module.

## Gates

- Focused tests: PASS
  - `npx jest tests/office/officeHubCollaborationSections.decomposition.test.ts tests/office/officeInviteHandoffSection.decomposition.test.ts tests/office/officeHub.extraction.test.ts tests/perf/performance-budget.test.ts --runInBand`
  - 4 suites passed, 32 tests passed.
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
  - 702 suites passed, 1 skipped; 4106 tests passed, 1 skipped.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- Artifact JSON parse: PASS
- Post-push `npm run release:verify -- --json`: PENDING

## Negative Confirmations

- No business logic changes.
- No temporary hooks added.
- No transport changes.
- No DB, env, or production calls.
- No production mutation.
- No Supabase project changes.
- No cache or rate-limit changes.
- No route expansion.
- No secrets printed.
- No TypeScript suppressions, unsafe any-casts, or empty catch blocks added.
- No OTA/EAS/TestFlight/native builds.
- No Realtime 50K/60K load.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
