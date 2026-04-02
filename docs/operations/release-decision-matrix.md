# Release Decision Matrix

Last updated: April 2, 2026

## Rule

Use OTA only when the change remains fully inside the currently installed native host and compatible `runtimeVersion`.

Use a new build whenever the change touches native compatibility, native configuration, or anything that must be baked into the binary.

If one batch contains both OTA-safe and build-required changes, the whole batch is treated as `new build required`.

## OTA Is Allowed

| Change class | Delivery | Project examples | Why |
| --- | --- | --- | --- |
| `js-ui` | OTA | screen text, layout cleanup, CTA wiring, React component composition | Pure JS/UI inside the current host |
| `js-logic` | OTA | hook logic, repository mapping, state orchestration | Native host does not change |
| `hook-service` | OTA | client-side service/refactor without native dependency | Still runtime-compatible JS |
| `ota-diagnostics` | OTA | `src/lib/otaDiagnostics.ts`, `src/features/profile/ProfileOtaDiagnosticsCard.tsx` | Release visibility is JS-only |
| `release-metadata` | OTA | optional git/release label shown in diagnostics | Metadata can travel with the update manifest/bundle |

## New Build Is Required

| Change class | Delivery | Project examples | Why |
| --- | --- | --- | --- |
| `native-module` | New build | adding/changing an Expo or RN native module | Binary host must include native code |
| `expo-plugin` | New build | changing `app.json -> expo.plugins` entries such as `expo-router`, `expo-updates`, `expo-speech-recognition` | Plugins alter native project generation |
| `app-config-native` | New build | changing `updates.url`, package identity, native-facing app config | Native-facing config lives in the binary |
| `permission-entitlement` | New build | `ios.infoPlist`, Android permissions, entitlements/capabilities | OS-level permissions are native |
| `bundle-identity` | New build | `ios.bundleIdentifier`, `android.package`, app identity changes | OTA cannot change installed app identity |
| `runtime-policy` | New build | changing `runtimeVersion`, switching runtime policy | OTA compatibility boundary changes |
| `native-asset` | New build | splash/icon/native asset changes that are baked into the app | Asset is packaged with the binary |

## Project-Specific Notes

### Current runtime policy

The project currently uses a fixed runtime string:

- `runtimeVersion = 1.0.0`

Implication:

- JS changes can keep shipping by OTA while they stay compatible with runtime `1.0.0`
- any change that makes the current host incompatible must also bump runtime policy and ship a new build

### Current build counter policy

The project currently uses:

- `eas.json -> cli.appVersionSource = remote`

Implication:

- build numbers advance on EAS servers
- local `app.json` build numbers are not enough to identify the installed binary
- use device diagnostics for the actual installed build number

## Decision Procedure

1. Classify the change.
2. If any touched area is in the build-required table, stop and make a new build plan.
3. If every touched area stays in the OTA-safe table, OTA is allowed.
4. Before publishing OTA, verify:
   - target channel
   - expected branch
   - installed runtimeVersion
   - installed native build lineage

## Examples

### Scenario A: OTA-safe patch

Examples:

- fixing a React screen
- changing a TS hook
- hardening the diagnostics card

Decision:

- publish OTA to the branch matching the installed build channel

### Scenario B: Build-required patch

Examples:

- changing `app.json -> plugins`
- changing `ios.infoPlist`
- changing `android.permissions`
- changing `runtimeVersion`

Decision:

- do not treat OTA as the primary solution
- build a new binary for the affected platform(s)

### Scenario C: Mixed batch

Examples:

- a JS bugfix plus a permission change
- a diagnostics patch plus a plugin change

Decision:

- `new build required`
- split the batch if you want the JS part to ship earlier through OTA
