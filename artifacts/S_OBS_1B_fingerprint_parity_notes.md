# S-OBS-1B-R2 Fingerprint Parity Notes

Wave: S-OBS-1B-R2 FIX_FINGERPRINTIGNORE_PATTERN_AND_RETRY_SENTRY_BINARY

## Context

- Previous committed recovery change: `a6ee6691ae4063380b572a1e6db8e9201cc9c518`
- Failed iOS build: `575d52ff-dd8d-41bb-bc05-b7de913e0618`
- Failed phase: `CONFIGURE_EXPO_UPDATES`
- Failed build runtimeVersion: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`

## Fix

`.fingerprintignore` was changed from:

```text
ios
```

to:

```text
ios/**/*
```

Reason: the previous pattern was too narrow for generated iOS directory contents during the post-prebuild fingerprint check. The new pattern targets only generated iOS contents and does not ignore Android, node_modules, package files, app config, or EAS config.

## Safety

- `ios/` committed: NO
- runtimeVersion policy changed: NO
- business logic changed: NO
- UI changed: NO
- SQL/RPC changed: NO
- Maestro YAML changed: NO
- package/app config changed: NO
- OTA published: NO
- secrets printed: NO
- secrets committed: NO

