# EAS Update Runbook

Last updated: April 25, 2026

Related docs:

- `docs/operations/release-lineage-audit.md`
- `docs/operations/release-decision-matrix.md`

## Canonical Mapping

- `development` channel -> `development` branch
- `preview` channel -> `preview` branch
- `production` channel -> `production` branch

Sync command:

```powershell
npm run ota:channels:sync
```

## Publish Rules

Canonical publish path:

```powershell
npm run release:preflight
npm run release:ota -- --channel <development|preview|production> --message "wave marker"
```

Direct `npx eas update ...` is not the supported release path for this repo anymore. Use the guarded script so the required gates, git-state checks, runtime classification, and release metadata are enforced together.

Production canary path:

```powershell
npm run release:ota -- --channel production --message "wave marker" --rollout-percentage <1-100>
```

Use the canary path for initial production exposure. Do not publish directly to 100% unless the wave explicitly approves a full rollout.

- iPhone / TestFlight: publish only to `production`

```powershell
npm run ota:publish:production -- --message "production marker 2026-03-19"
```

- Android preview APK: publish only to `preview`

```powershell
npm run ota:publish:preview -- --message "preview marker 2026-03-19"
```

- Development build / Expo Go: publish only to `development`

```powershell
npm run ota:publish:development -- --message "development marker 2026-03-19"
```

## Release Verification Scripts

Use the read-only scripts before publishing or dry-running a release decision:

```powershell
npm run release:verify
npx tsx scripts/release/print-release-config.ts --json
npx tsx scripts/release/check-release-discipline.ts --channel production --change-class js-ui --json
```

## Device Verification

1. Publish to the branch that matches the installed build channel.
2. Fully kill the app.
3. Launch the app once to download the update.
4. Fully kill the app again.
5. Launch the app a second time to apply the update.

Current app behavior:

- `updates.checkAutomatically = ON_LOAD`
- `updates.fallbackToCacheTimeout = 30000`

So the release startup contract is:

- cold-launch on stable network
- allow up to 30 seconds for the startup OTA check to complete
- if diagnostics later show `downloaded-pending-relaunch`, fully kill and relaunch once to apply the downloaded update

## In-App Diagnostics

Open `Profile` and scroll to the OTA diagnostics block. It shows:

- `channel`
- `severity`
- `runtimeVersion`
- `appVersion`
- `nativeBuildVersion`
- `updateId`
- `isEmbeddedLaunch`
- `launchSource`
- `createdAt`
- passive update availability state
- last update age / probable stale state
- expected publish branch
- checkAutomatically / fallbackToCacheTimeout
- optional release label / git commit / update group id when metadata is embedded
- Expo project id / updates url
- issue list and recommended actions

Use the in-app actions:

- release builds: `Показать шаги OTA` -> safe next-step guidance without triggering manual check/fetch
- development-client only: `Проверить OTA сейчас` -> manual check + fetch without changing boot flow
- `Скопировать диагностику` -> share the exact device state when debugging OTA behavior

Severity interpretation:

- `OK` -> config looks healthy, publish to the expected branch only
- `WARNING` -> the app is stale, embedded, has a pending relaunch, or shows lineage mismatch signals; follow the actions block and relaunch when instructed
- `ERROR` -> runtime/config metadata is missing or `expo-updates` is disabled; verify build config before blaming OTA publish

## Common Mistake

Do not compare:

- localhost web
- Android preview APK
- iPhone TestFlight production build

as if they were on the same release track. Always compare the installed build channel to the published branch first.
