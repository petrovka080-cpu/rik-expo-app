# OTA Metadata Enforcement

Last updated: April 28, 2026

## Goal

`npm run release:verify -- --json` now reports a machine-readable
`releaseMetadata` block. The block makes release and rollback readiness explicit
without requiring an OTA publish.

## Required Metadata

The release metadata block reports:

- git SHA
- app version or build lineage
- runtimeVersion
- channel and branch when applicable
- platform when applicable
- OTA disposition
- rollback readiness
- Sentry source map proof status
- binary/source map proof status
- whether EAS build, submit, or update was triggered
- whether OTA was published

## OTA Disposition

The normalized values are:

- `skip`: current release commit does not need OTA.
- `candidate`: current release commit is OTA-capable but has not been published.
- `published`: guarded OTA publish metadata exists in the report.
- `blocked`: release policy or gates block OTA.

`skip` is valid and should not fail verification when the commit is docs, tests,
scripts, or proof-only.

## Source Map Discipline

Sentry source maps and binary/source map proof are not marked shipped unless
proof exists in the release report. If no OTA was published, they are
`not_applicable`. If an OTA publish is reported without proof artifacts, they
are `missing`.

## Rollback Readiness

`releaseMetadata.rollbackReady=true` means:

- worktree is clean
- HEAD matches `origin/main`
- git SHA is present
- runtime policy is valid
- runtime proof matches app config
- startup OTA policy is valid

This is readiness for rollback planning, not owner approval for a production
release action.

## Secret Redaction

Release verification and rollback dry-runs must not print:

- Expo tokens
- Sentry auth tokens
- Supabase keys
- service-role JWTs
- signed URL tokens
- authorization headers
- private update credentials

The rollback helper redacts token-like values in the execution plan.

## Safe Commands

Dry-run rollback:

```powershell
node scripts/release/rollback-ota.mjs `
  --target staging `
  --channel staging `
  --runtime-version test-runtime `
  --rollback-to test-update-id `
  --dry-run `
  --json
```

Release verification:

```powershell
npm run release:verify -- --json
```

This wave does not run `eas update`, does not publish OTA, and does not mutate
release channels.
