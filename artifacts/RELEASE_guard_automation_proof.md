# RELEASE_GUARD_AUTOMATION Proof

## Exact tests and gates run

### Focused release automation tests

```bash
npx jest tests/release/releaseGuard.shared.test.ts tests/release/releaseGuard.contract.test.ts src/shared/release/releaseInfo.test.ts --runInBand --no-coverage
```

Result: `PASS`

Protected branches:

- package.json scripts-only classification stays non-runtime
- package.json dependency change blocks OTA
- runtime JS/TS classification stays OTA-eligible
- native/release-host files block OTA
- dirty worktree / failed gates block release
- non-runtime diff skips OTA
- missing metadata / missing artifact block runtime OTA
- EAS update metadata parsing is deterministic
- package scripts no longer expose direct `eas update` as the canonical path
- runbook documents the guarded path

### Full required gates

```bash
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
npm test
git diff --check
```

Result: all `PASS`

## Successful guarded release simulation

The current wave changes only tooling/docs/tests/package scripts. Release automation classifies this scope as `non-runtime`, so OTA must not publish.

Success condition for this wave:

- guarded preflight gates pass
- canonical publish path is reachable
- OTA is skipped rather than published for non-runtime-only scope

This behavior is protected by focused tests:

- `tests/release/releaseGuard.shared.test.ts`
- `tests/release/releaseGuard.contract.test.ts`

## Blocked invalid release simulation

Command executed:

```bash
npx tsx scripts/release/run-release-guard.ts verify --channel production --require-artifact artifacts/does-not-exist.json --json
```

Observed result:

- exit code `1`
- release blocked
- blockers included:
  - dirty worktree
  - missing required artifact

This proves the canonical guard fails closed instead of allowing a best-effort publish.

## Runtime / non-runtime classification proof

### Non-runtime proof

Protected by focused tests:

- docs/scripts/tests plus `package.json` scripts-only mutation => `non-runtime`
- OTA disposition => `skip`

This matches the current wave scope:

- `docs/operations/*`
- `scripts/release/*`
- `tests/release/*`
- `package.json` scripts-only rewiring
- `scripts/preflight-prod.js`

### Runtime proof

Protected by focused tests:

- `src/...` or `app/...` runtime file mutations => `runtime-ota`
- runtime OTA requires full preflight and explicit publish metadata

### Build-required proof

Protected by focused tests:

- `app.json`
- `eas.json`
- `android/*`
- `ios/*`
- unknown/unclassified release-host paths

All of the above block OTA and force a build-required verdict.

## Metadata proof

Metadata hardening is proven in two places:

1. Guard report shape includes:
   - repo branch
   - `HEAD`
   - `origin/main`
   - target channel
   - expected branch
   - classification
   - gate statuses
2. `parseEasUpdateOutput(...)` is covered by focused tests and extracts:
   - update group id
   - Android update id
   - iOS update id
   - runtime version
   - commit
   - dashboard URL

This removes the old "metadata is optional by convention" gap from the canonical release path.
