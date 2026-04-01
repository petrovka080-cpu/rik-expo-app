# Wave 21 Build Discipline

## Scope

This document records the governance guardrails introduced in Wave 21.
It does not change runtime semantics, UI behavior, SQL bodies, or product flows.

## Coverage Discipline

### Current Jest posture

- `jest.config.js` already defines curated coverage collection for critical code paths:
  - `src/lib/offline/mutationQueue.ts`
  - `src/lib/offline/mutationWorker.ts`
  - `src/lib/offline/mutation.retryPolicy.ts`
  - `src/lib/offline/mutation.conflict.ts`
  - `src/screens/profile/profile.services.ts`
  - `src/screens/profile/hooks/useProfileDerivedState.ts`
  - `src/screens/profile/components/ProfilePrimitives.tsx`
- Global coverage thresholds remain:
  - statements: `60`
  - branches: `40`
  - functions: `70`
  - lines: `60`

### Why these thresholds stay canonical

- They are already enforced by Jest coverage runs.
- They are realistic against the current curated baseline and do not create fake red CI.
- Current baseline from `artifacts/wave8-coverage/coverage-summary.json`:
  - statements: `63.34`
  - branches: `44.56`
  - functions: `75.38`
  - lines: `64.72`

### Governance changes in this wave

- `npm test` no longer uses `--passWithNoTests`.
- `npm run test:watch` no longer uses `--passWithNoTests`.
- Canonical enforcement command:
  - `npm run verify:coverage:governance`
- Canonical static governance verify chain:
  - `npm run verify:governance:static`

### Rule

- `--passWithNoTests` is not allowed on the default Jest entrypoints.
- Coverage enforcement must stay attached to a curated critical-path suite, not to an aspirational full-repo threshold.

## `database.types.ts` Hygiene

### Audit result

- Wave 21 audit found no ordinary runtime imports from `database.types.ts` in `src`, `scripts`, or `app`.
- Current repo usage is already type-only via `import type`.

### Governance change in this wave

- Canonical static verifier:
  - `npm run verify:db-types:imports`
- Backing script:
  - `scripts/verify-database-types-imports.js`

### Rule

- Imports from `database.types.ts` must stay type-only.
- If a runtime import is introduced, `verify:db-types:imports` must fail before merge.
- Prefer domain-local typed facades where a module only needs a narrowed subset of the database contract.

## Dependency Decisions

Wave 21 audited the likely-unused candidates called out in the audit. No removal was safe in this pass.

### `expo-audio`

- Retained.
- Evidence:
  - Expo config plugin in `app.json`
  - local dev-client/runtime bootstrap failed when the module was missing from `node_modules`
- Governance note:
  - this dependency is config/native relevant even though repo runtime imports are currently absent

### `expo-haptics`

- Retained.
- Evidence:
  - runtime import in `src/screens/accountant/useAccountantNotifications.ts`

### `expo-intent-launcher`

- Retained.
- Evidence:
  - runtime import in `src/lib/documents/attachmentOpener.ts`
  - explicit native-open tests around the same path

### `react-native-chart-kit`

- Retained.
- Evidence:
  - runtime import in `src/features/reports/ReportsDashboardScreen.tsx`

### Rule

- Candidate dependencies must be classified with usage proof or safe-removal proof.
- Config/plugin/native relevance counts as real usage.
- No package removal is allowed from grep alone.
