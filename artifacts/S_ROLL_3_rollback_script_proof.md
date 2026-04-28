# S-ROLL-3 Rollback Script Proof

## Scope

Added a production-safe OTA rollback planning helper:

- `scripts/release/rollback-ota.mjs`

The helper defaults to dry-run, emits JSON, requires explicit target/channel/
runtimeVersion/rollback target, and rejects production execute without
`--owner-approved`.

## Dry-Run Proof

Command:

```powershell
node scripts/release/rollback-ota.mjs --target staging --channel staging --runtime-version test-runtime --rollback-to test-update-id --dry-run --json
```

Result summary:

- status: `dry_run`
- `commandsPlanned`: `[]`
- `commandsExecuted`: `[]`
- `otaPublished`: `false`
- `easUpdateTriggered`: `false`
- `productionTouched`: `false`
- `secretsPrinted`: `false`

## Negative Production Safety Check

Command:

```powershell
node scripts/release/rollback-ota.mjs --target production --channel production --runtime-version test-runtime --rollback-to test-update-id --execute --json
```

Result summary:

- status: `rejected`
- reason: `Production execute requires explicit --owner-approved.`
- `commandsExecuted`: `[]`
- `otaPublished`: `false`
- `easUpdateTriggered`: `false`
- `productionTouched`: `false`

## Redaction

Tests cover token-like strings, JWT-like strings, signed URL query tokens,
service-role-like JWTs, Sentry token-like values, and Expo token-like values.
The helper does not print raw process environment values.

## Safety Confirmations

- No `eas update` was run.
- No OTA was published.
- No release channel was mutated.
- No EAS build was triggered.
- No EAS submit was triggered.
- No production system was touched.
- No SQL/RPC/RLS/storage policy was changed.
- No package, app, EAS, native, or business logic files were changed.
