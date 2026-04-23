# OTA_RUNTIME_STABILIZATION_AND_RELEASE_FLOW Proof

## Before

Repo-visible runtime policy before this wave:

```json
"runtimeVersion": {
  "policy": "fingerprint"
}
```

Release metadata also reported:

```json
"runtimePolicy": "fingerprint"
```

Risk: normal JS/TS changes could move OTA publication into a new fingerprint-derived runtime lineage, so an already installed binary could miss the update.

## After

Repo-visible runtime policy after this wave:

```json
"runtimeVersion": "1.0.0"
```

Release metadata:

```json
"runtimePolicy": "fixed(1.0.0)"
```

## Expo Config Proof

Command:

```bash
npx expo config --json
```

Resolved values:

```json
{
  "runtimeVersion": "1.0.0",
  "updates": {
    "enabled": true,
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0,
    "url": "https://u.expo.dev/93959cca-1c92-4b59-b80a-f1a1f5dfdf5a"
  },
  "extra": {
    "release": {
      "runtimePolicy": "fixed(1.0.0)",
      "appVersionSource": "remote",
      "runtimeStabilizationProof": {
        "fixedRuntime": "1.0.0",
        "stabilizedAt": "2026-04-23",
        "wave": "OTA_RUNTIME_STABILIZATION_AND_RELEASE_FLOW"
      },
      "channelBranchMapping": {
        "development": "development",
        "preview": "preview",
        "production": "production"
      }
    }
  }
}
```

Fingerprint-derived runtime lineage is no longer configured.

## Build Refresh Proof

One new production binary per platform was created after switching from fingerprint runtime policy to fixed runtime policy.

- iOS production build: PASS.
- iOS build ID: `90d74d45-9e85-441f-970f-161d8dc487de`.
- iOS app build version: `28`.
- iOS runtimeVersion: `1.0.0`.
- iOS commit: `6a9ff3aedce0c1d6adbdcb6151c0448b283b4e19`.
- iOS artifact: `https://expo.dev/artifacts/eas/iTn7DBUhS6JwouZYwHp6Af.ipa`.
- Android production build: PASS.
- Android build ID: `249ff52c-12d7-43e6-a92d-571a578f5bb1`.
- Android app build version: `5`.
- Android runtimeVersion: `1.0.0`.
- Android commit: `6a9ff3aedce0c1d6adbdcb6151c0448b283b4e19`.
- Android artifact: `https://expo.dev/artifacts/eas/5wiZJ1fRPDSjzCN2L4sqMx.aab`.

Both builds are on channel `production` and runtimeVersion `1.0.0`.

## OTA Proof

After the build refresh, a JS/config-only release metadata marker was committed and published as a production OTA.

- Proof marker commit: `f8a1e77fde8d1a6a5604636860bb786441136c4f`.
- Command: `npx eas update --branch production --message "INFRA: stable runtime OTA proof marker"`.
- Branch: `production`.
- Runtime version: `1.0.0`.
- Platforms: `android, ios`.
- Update group ID: `7e96c76c-fd86-43db-a65f-518e82c33b84`.
- Android update ID: `019db874-d281-7db8-bcb7-e925f42e8715`.
- iOS update ID: `019db874-d281-733e-88b8-8f36d148df2f`.

CLI/server-side proof:

```text
production build runtimeVersion = 1.0.0
production OTA runtimeVersion = 1.0.0
branch = production
platforms = android, ios
```

This proves the new binaries and the follow-up JS/config-only OTA are in the same stable runtime line.

Device-side note: this terminal cannot physically install and open the iOS/Android artifacts, so final in-app diagnostics still need to be captured on an installed production build. The expected diagnostics are `runtimeVersion = 1.0.0` and `channel = production`.

## Gate Results

- `npx jest tests/release/releaseConfig.shared.test.ts tests/release/release-safety.test.ts --runInBand --no-coverage` - PASS.
- `npx tsc --noEmit --pretty false` - PASS.
- `npx expo lint` - PASS.
- `npm test -- --runInBand` - PASS.
- `npm test` - PASS.
- `git diff --check` - PASS.

## Semantics

Business semantics changed: `false`.

Runtime app code changed: `false`.

Infrastructure config changed: `true`.
