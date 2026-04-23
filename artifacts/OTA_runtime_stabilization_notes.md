# OTA_RUNTIME_STABILIZATION_AND_RELEASE_FLOW Notes

## Root Cause

The project used Expo fingerprint runtime lineage:

```json
"runtimeVersion": {
  "policy": "fingerprint"
}
```

With fingerprint runtime policy, ordinary JS/TS waves can produce a new runtime lineage. Already installed binaries then do not see OTA updates that were published for the new lineage.

## Change

The runtime policy is now fixed and manual:

```json
"runtimeVersion": "1.0.0"
```

Release metadata now mirrors that contract:

```json
"extra": {
  "release": {
    "runtimePolicy": "fixed(1.0.0)"
  }
}
```

A permanent release metadata proof marker was also added under `extra.release.runtimeStabilizationProof`.
It is not business logic and does not affect screens, state, permissions, network behavior, or domain contracts.

## Fixed Runtime

Selected fixed runtime: `1.0.0`.

This matches the existing app version and the existing release documentation that already treats `1.0.0` as the stable OTA runtime line.

## JS-Only Waves

Do not change `runtimeVersion` for:

- TS/JS changes.
- React component changes.
- Zustand/store logic changes.
- Route changes.
- Pure helpers/contracts/tests.
- Backend SQL-only changes when the native app host remains compatible.
- Proof/artifact-only changes.

For these waves the release path is:

```text
commit -> push -> eas update --branch production
```

## Binary-Required Waves

Change runtime and ship new binaries only for:

- Native module changes.
- Expo plugin changes.
- App config changes that require a new binary.
- Permission, entitlement, plist, or Android manifest changes.
- Any change incompatible with the old installed native host.

For these waves the release path is:

```text
commit -> push -> eas build -p ios --profile production
commit -> push -> eas build -p android --profile production
```

## Scope Control

No business logic, screens, state, SQL, Supabase, API contracts, domain modules, or UI behavior were changed.
