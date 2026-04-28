# S-OBS-1B-R2 Fingerprint Parity Proof

## Repo

- HEAD before: `a6ee6691ae4063380b572a1e6db8e9201cc9c518`
- HEAD after: commit containing this proof artifact
- origin/main before: `a6ee6691ae4063380b572a1e6db8e9201cc9c518`
- worktree clean before edit: YES

## Fingerprint Ignore

- previous `.fingerprintignore` content: `ios`
- new `.fingerprintignore` content: `ios/**/*`
- `ios/` tracked file count: `0`
- Android tracked files: YES

## Failed Build Baseline

- failed build ID: `575d52ff-dd8d-41bb-bc05-b7de913e0618`
- failed status: `ERRORED`
- failed platform: `IOS`
- failed phase: `CONFIGURE_EXPO_UPDATES`
- failed runtimeVersion: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`
- failed app version/build number: `1.0.0 / 35`

## Local Fingerprint Checks

- local iOS fingerprint after fix, run 1: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`
- local iOS fingerprint after fix, run 2: `329c5b0bb69e8e95e072c22d653f098fd60bf99e`
- iOS repeated fingerprint stable: YES
- local Android fingerprint after fix: `2eb1a9dfacdc8037b20eccf538572182d6c35ec0`
- compare against failed build: local iOS hash matched failed build stored hash
- generated `ios/` diff in compare output: NOT REPORTED BY JSON SUMMARY

## Gates Before Commit

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `git diff --check`: PASS
- `npm run release:verify -- --json`: internal gates PASS; readiness FAIL expected before commit because worktree is dirty
- `otaDisposition`: `block`

## Forbidden Changes

- runtimeVersion policy changed: NO
- business logic changed: NO
- UI changed: NO
- SQL/RPC changed: NO
- Maestro YAML changed: NO
- package changed: NO
- app config changed: NO
- release guard weakened: NO
- OTA published: NO
- secrets printed: NO
- secrets committed: NO

