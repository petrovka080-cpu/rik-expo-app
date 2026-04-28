# OTA Rollback Runbook

Last updated: April 28, 2026

## Scope

This runbook describes the production-safe rollback helper added in
S-ROLL-3 / S-OTA-2. The helper is dry-run-first and does not publish OTA
updates by default.

## Safe Dry-Run

Use dry-run first for every rollback plan:

```powershell
node scripts/release/rollback-ota.mjs `
  --target staging `
  --channel staging `
  --runtime-version test-runtime `
  --rollback-to test-update-id `
  --dry-run `
  --json
```

Required parameters:

- `--target`: `development`, `preview`, `staging`, or `production`
- `--channel`: intended EAS update channel or branch
- `--runtime-version`: runtime lineage expected on the affected binary
- `--rollback-to`: safe update identifier or source commit reference

Dry-run output records:

- current git SHA
- intended target, channel, runtimeVersion, and rollback target
- `otaPublished=false`
- `easUpdateTriggered=false`
- `productionTouched=false`
- empty `commandsExecuted`

## Production Safety

Production execution is rejected unless both flags are present:

```powershell
--execute --owner-approved
```

The negative safety check is:

```powershell
node scripts/release/rollback-ota.mjs `
  --target production `
  --channel production `
  --runtime-version test-runtime `
  --rollback-to test-update-id `
  --execute `
  --json
```

Expected result:

- status is `rejected`
- no EAS command is executed
- no OTA is published
- production is not touched

This wave does not perform a successful production execute path. Owner approval
and the final release action remain manual.

## Verify Channel And Runtime

Before any real rollback:

1. Capture in-app OTA diagnostics from the affected device.
2. Confirm the device channel matches the intended EAS branch.
3. Confirm `runtimeVersion` matches the installed binary lineage.
4. Confirm the rollback target belongs to the same channel and runtime lineage.
5. Run:

```powershell
npm run release:verify -- --json
```

Interpretation:

- `otaDisposition=skip`: no OTA publish is needed for the current commit.
- `otaDisposition=candidate` or `allow`: runtime files are OTA-capable but still require release discipline.
- `otaDisposition=blocked`: do not publish OTA.
- `releaseMetadata.rollbackReady=true`: repo state and release policy are ready for rollback planning.

## Source Maps And Debug IDs

Do not mark Sentry source maps or binary/source map proof as shipped unless the
release artifacts prove it. Missing proof must be reported as `missing` or
`not_applicable`, never silently assumed.

## What Is Not Automatic

The helper does not:

- run `eas update` during dry-run
- publish or republish OTA
- mutate channels or branches
- validate production devices by itself
- prove source maps unless a release artifact exists
- use production secrets

## Emergency Checklist

1. Confirm incident scope and affected channel.
2. Capture device diagnostics: channel, runtimeVersion, updateId, native build.
3. Pick rollback target from the same channel/runtime lineage.
4. Run the rollback helper in dry-run JSON mode.
5. Run `npm run release:verify -- --json`.
6. Get owner approval before any production release action.
7. Record the command output and release metadata proof.

## S-ROLL-3 Proof

S-ROLL-3 / S-OTA-2 added only dry-run tooling, docs, tests, and proof artifacts.
It does not publish OTA and does not trigger EAS build, submit, or update.
