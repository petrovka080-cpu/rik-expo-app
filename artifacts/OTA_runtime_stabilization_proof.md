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

Status before release tail:

- iOS production build: pending.
- Android production build: pending.

One new production binary per platform is required because changing runtime policy changes the OTA compatibility boundary.

## OTA Proof

Status before release tail:

- Production OTA proof: pending until stable-runtime binaries are built and installed.

Expected stable behavior after build refresh:

```text
JS-only change -> eas update --branch production -> installed production binary on runtime 1.0.0 receives update
```

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
