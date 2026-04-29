# S-OTA-PHONE-1 Publish Proof

Status: PARTIAL

PARTIAL reason: the iOS OTA was published and verified from EAS output, but physical phone verification requires the owner because the agent cannot open the owner's iOS device.

## Release Decision

- Target: production
- Branch: production
- Channel: production
- Runtime version: bc9c9355222395cbde647610ec48487de37efc6b
- Platforms: ios only
- Owner approval: OWNER_APPROVES_OTA_PUBLISH_NOW: YES
- Owner device context: no physical Android; Android is emulator/APK only; physical phone is iOS.
- Source maps available for upload: no, Sentry environment is missing.
- Rollback script available: yes, scripts/release/rollback-ota.mjs
- release:verify status before publish: pass

## Why This Target Matches The Phone Build

- The repo release runbook maps iPhone/TestFlight builds to the production channel/branch.
- EAS build discovery showed the latest submitted iOS production build as build 37 on channel production with runtimeVersion bc9c9355222395cbde647610ec48487de37efc6b.
- Local iOS runtime resolution after restoring node_modules with npm ci returned the same runtimeVersion: bc9c9355222395cbde647610ec48487de37efc6b.
- Android was intentionally not targeted because there is no physical Android phone for OTA verification.

## Command Run

```bash
npx eas update --branch production --platform ios --message "OTA: phone update d3eaf40" --non-interactive --json
```

No EAS build or EAS submit command was run.

## EAS Update Result

- Update ID: 019dd726-5912-7c74-90f3-5d3823b92c87
- Group: d6901d53-b016-4202-9cc5-64ce61f14388
- Branch: production
- Runtime version: bc9c9355222395cbde647610ec48487de37efc6b
- Platform: ios
- Message: OTA: phone update d3eaf40
- Git commit: d3eaf40bb3430b5eff308925cb71a90c42033a55
- isRollBackToEmbedded: false

## Source Maps / Sentry

- SENTRY_AUTH_TOKEN: missing
- SENTRY_ORG: missing
- SENTRY_PROJECT: missing
- OTA source map upload status: env_missing
- EAS export generated an iOS bundle map locally during publish, but Sentry upload was not performed because the required Sentry environment was not present.
- No Sentry token value was printed.

## Rollback Readiness

Rollback dry-run command:

```bash
node scripts/release/rollback-ota.mjs --target production --channel production --runtime-version bc9c9355222395cbde647610ec48487de37efc6b --rollback-to d3eaf40bb3430b5eff308925cb71a90c42033a55 --dry-run --json
```

Rollback dry-run result:

- status: dry_run
- execute: false
- commandsPlanned: []
- commandsExecuted: []
- otaPublished: false
- easUpdateTriggered: false
- productionTouched: false
- rollbackExecuted: false

Previous safe update ID for this exact iOS runtime was not confirmed in this wave, so rollback target remains owner_action_required if an actual rollback is ever needed.

## Phone Verification

Phone verification status: owner_action_required

Owner checklist:

1. Open the iOS app on the phone.
2. Fully close and reopen the app if the update is not immediate.
3. Wait for the configured Expo Updates ON_LOAD check/apply behavior.
4. Confirm the changed code path is visible.
5. Confirm the app does not crash on launch.
6. Share only the update ID or a non-sensitive screenshot if confirmation is needed.

## Gates Before Publish

- git diff --check: passed
- npx tsc --noEmit --pretty false: passed
- npx expo lint: passed
- npm test -- --runInBand: passed
- npm test: passed
- npm run release:verify -- --json: passed
- Worktree clean before publish: yes
- HEAD == origin/main before publish: yes

## Gates After Publish

- npm run release:verify -- --json: passed
- Worktree clean before proof artifacts: yes

## Safety Confirmation

- Business logic changed in this wave: NO
- SQL/RPC changed in this wave: NO
- RLS/storage changed in this wave: NO
- Package/native config changed in this wave: NO
- Production data touched: NO
- Production writes: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: YES, exactly once for iOS OTA
- OTA published: YES, exactly once for iOS
- Secrets printed: NO
- Secrets committed: NO
