# RELEASE_GUARD_AUTOMATION Notes

## Current release weaknesses found

1. `package.json` exposed direct `ota:publish:*` scripts that called `npx eas update --branch ...` without a required repo-state or test preflight.
2. `scripts/preflight-prod.js` only validated local env shape and did not enforce `tsc`, `expo lint`, serial/parallel Jest, `git diff --check`, clean worktree, or `HEAD == origin/main`.
3. Release docs still advertised direct publish commands as the primary operator path, so docs and real discipline had drifted apart.
4. Runtime-vs-non-runtime release classification was documented read-only, but not enforced on the publish path.
5. Release metadata for guarded publish lineage was not normalized into one technical guard output.

## Exact scripts and files introduced or changed

### New

- `scripts/release/releaseGuard.shared.ts`
- `scripts/release/run-release-guard.ts`
- `tests/release/releaseGuard.shared.test.ts`
- `tests/release/releaseGuard.contract.test.ts`

### Changed

- `package.json`
- `scripts/preflight-prod.js`
- `docs/operations/eas-update-runbook.md`
- `docs/operations/release-decision-matrix.md`
- `docs/operations/release-lineage-audit.md`

## What is now technically enforced

1. Canonical release entrypoints now exist:
   - `release:preflight`
   - `release:verify`
   - `release:ota`
2. The public `ota:publish:development|preview|production` scripts no longer call `eas update` directly. They route through the guarded release CLI.
3. Guarded preflight runs and records:
   - `npx tsc --noEmit --pretty false`
   - `npx expo lint`
   - `npm test -- --runInBand`
   - `npm test`
   - `git diff --check`
4. Guarded readiness blocks release when:
   - worktree is dirty
   - `HEAD != origin/main`
   - any required gate fails
   - required proof artifacts are missing
   - OTA is requested for a `build-required` diff
   - runtime OTA is requested without channel/message metadata
5. Runtime classification is now technical, not human-memory-only:
   - tooling/docs/tests/scripts/sql-only -> `non-runtime` -> OTA skipped
   - runtime JS/TS -> `runtime-ota` -> OTA allowed only after full preflight
   - native/release-host config or unknown paths -> `build-required` -> OTA blocked
6. Guard output now includes normalized release metadata fields:
   - repo branch
   - `HEAD`
   - `origin/main`
   - target channel
   - expected branch
   - classification kind
   - gate outcomes
   - parsed EAS update lineage when OTA actually runs

## What intentionally stays out of scope

1. App business logic, role flows, PDF semantics, SQL/RPC semantics, and UI logic were not touched.
2. Raw shell access can still manually run `npx eas update` outside the npm scripts; this wave hardens the canonical repo-owned publish path, package entrypoints, docs, and proof discipline.
3. Native build automation is not introduced here. `build-required` classification intentionally blocks OTA instead of inventing a build pipeline rewrite.
