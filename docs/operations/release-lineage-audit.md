# Release Lineage Audit

Last updated: April 2, 2026

## Scope

This document defines the current release topology for `rik-expo-app` and the production-safe source of truth for answering:

- which installed binary is on the device
- which OTA update is currently running
- whether a new OTA should apply to that binary
- when a new build is required instead of another OTA publish

## Current Topology

### App config

- `app.json -> expo.version = 1.0.0`
- `app.json -> expo.runtimeVersion = 1.0.0`
- `app.json -> expo.updates.enabled = true`
- `app.json -> expo.updates.checkAutomatically = ON_LOAD`
- `app.json -> expo.updates.fallbackToCacheTimeout = 0`
- `app.json -> expo.updates.url = https://u.expo.dev/93959cca-1c92-4b59-b80a-f1a1f5dfdf5a`

### EAS build config

- `eas.json -> cli.appVersionSource = remote`
- build profile `development` -> channel `development`
- build profile `preview` -> channel `preview`
- build profile `production` -> channel `production`

### Canonical channel/branch mapping

- `development` channel -> `development` branch
- `preview` channel -> `preview` branch
- `production` channel -> `production` branch

This project treats the mapping above as canonical. Any non-canonical channel or branch pointer is a release-discipline violation.

## Source Of Truth

### Installed binary identity

Use the installed app itself:

- `Application.nativeApplicationVersion`
- `Application.nativeBuildVersion`

This is the source of truth for the build actually running on the device.

### Installed update identity

Use `expo-updates` runtime values:

- `channel`
- `runtimeVersion`
- `updateId`
- `createdAt`
- `isEmbeddedLaunch`
- `launch source`
- passive update state from `useUpdates()`

This is the source of truth for the currently applied OTA lineage.

### Release config contract

Use repo config files:

- `app.json`
- `eas.json`
- `src/shared/release/releaseInfo.ts`
- `src/shared/release/releaseInfo.types.ts`

These define the intended release policy, not necessarily the already-shipped build counter on EAS servers.

## Important Risk: Remote App Version Source

`eas.json` uses `appVersionSource = remote`.

That means:

- local `app.json -> ios.buildNumber`
- local `app.json -> android.versionCode`

are not authoritative for already-shipped binaries.

EAS Build owns the real incremented build counters for release builds. A device can honestly report build `21` even if the local repo still shows `13` in `app.json`.

Rule:

- for installed build lineage, trust device/runtime diagnostics
- for release policy, trust `app.json` + `eas.json`
- do not infer installed build lineage from local `app.json` when `appVersionSource=remote`

## OTA Apply Model

Because the project currently uses:

- `checkAutomatically = ON_LOAD`
- `fallbackToCacheTimeout = 0`

the expected release behavior is:

1. launch once to allow OTA download
2. cold-launch again to apply it

This is the default expected behavior for release validation unless diagnostics show a different passive state such as:

- update available
- downloaded and relaunch pending
- embedded launch
- check/download error

## Current Risks

1. Local native build numbers can diverge from shipped binaries because `appVersionSource=remote`.
2. `runtimeVersion` is pinned to a fixed string (`1.0.0`), so native-incompatible changes cannot be papered over with OTA.
3. Comparing `localhost web`, `preview APK`, and `TestFlight production` as if they were one track creates false mismatch conclusions.
4. Optional release metadata such as git commit or release label may be absent unless explicitly embedded into the bundle/update.

## Fixed Risks In This Wave

1. Release lineage is now normalized through one typed contract instead of multiple ad-hoc readers.
2. In-app diagnostics now show binary identity, update identity, passive availability state, metadata source, and health verdict from one canonical model.
3. Read-only release verification scripts now print the current release contract and OTA-vs-build decision outcome.
4. The project now has explicit documentation for source-of-truth rules and OTA/new-build discipline.
5. Guarded release automation now enforces full preflight, git-state checks, and runtime-vs-non-runtime OTA classification before publish.

## Allowed

- OTA for JS/UI/logic fixes within the current native host and runtime
- release metadata embedded in JS/update scope
- diagnostics/read-only verification scripts
- documenting exact branch/channel/runtime policy

## Forbidden

- blind OTA publishing without confirming channel/runtime lineage
- blind rebuilds "just in case"
- treating local `app.json` build numbers as device truth while `appVersionSource=remote`
- shipping native-affecting changes without a new build
- mixing different release tracks when validating one issue

## In-App Diagnostics Contract

The diagnostics block in `Profile` is now expected to show:

- app version
- native build number
- configured runtimeVersion
- channel
- expected branch
- update id
- embedded vs OTA launch source
- createdAt
- passive update availability state
- configured update policy
- optional release metadata when present
- health verdict: `ok`, `warning`, `error`

## Proof Discipline

When debugging a release issue:

1. capture in-app diagnostics
2. capture release script output
3. identify the installed binary by app version + native build
4. identify the running update by channel + runtime + update id + launch source
5. only then decide whether the fix is OTA-safe or build-required

If step 3 or 4 is missing, release debugging is incomplete.
