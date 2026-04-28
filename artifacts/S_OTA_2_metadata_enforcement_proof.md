# S-OTA-2 Metadata Enforcement Proof

## Scope

Strengthened release verification metadata without changing app behavior or
release config.

Changed release verification files:

- `scripts/release/releaseGuard.shared.ts`
- `scripts/release/run-release-guard.ts`

Added tests:

- `tests/release/releaseGuard.shared.test.ts`
- `tests/release/rollback-ota.test.ts`

Added docs:

- `docs/operations/rollback_runbook.md`
- `docs/release/ota_metadata_enforcement.md`

## Release Metadata Enforcement

`npm run release:verify -- --json` now includes `releaseMetadata` with:

- git SHA presence
- app version and build lineage presence
- runtimeVersion presence
- channel/branch/platform status
- normalized OTA disposition: `skip`, `candidate`, `published`, or `blocked`
- rollback readiness
- Sentry source map proof status
- binary/source map proof status
- EAS build/submit/update booleans
- OTA published boolean
- explicit `missing` and `warnings` arrays

Rules preserved:

- `otaDisposition=skip` remains valid.
- Missing metadata is reported explicitly.
- Sentry/source maps are not claimed shipped without proof.
- Existing release verification JSON remains compatible.

## Tests Run

Targeted:

```powershell
npx tsc --noEmit --pretty false
npm test -- --runInBand release rollback ota metadata
```

Results:

- TypeScript: passed
- Release/rollback/OTA/metadata tests: passed, 10 suites / 83 tests

## Dry-Run Commands

Staging dry-run passed with no EAS command executed:

```powershell
node scripts/release/rollback-ota.mjs --target staging --channel staging --runtime-version test-runtime --rollback-to test-update-id --dry-run --json
```

Production execute without owner approval was rejected with no EAS command
executed:

```powershell
node scripts/release/rollback-ota.mjs --target production --channel production --runtime-version test-runtime --rollback-to test-update-id --execute --json
```

## Safety Confirmations

- Business logic changed: false
- App behavior changed: false
- SQL/RPC changed: false
- RLS/storage changed: false
- Native config changed: false
- Package changed: false
- Production touched: false
- Production writes: false
- OTA published: false
- EAS build triggered: false
- EAS submit triggered: false
- EAS update triggered: false
- Secrets printed: false
- Secrets committed: false
