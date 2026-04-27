## V4-8B Profile Entry Harness Fix Proof

### Status
- Result: GREEN_READY_FOR_COMMIT
- Goal: recover `npm run e2e:maestro:critical` without changing V4-8 product code
- Final critical suite: PASS, `14/14`
- OTA published: NO

### Root Cause
- Initial V4-8 blocker: profile/office/market selectors were not reached reliably by Maestro.
- Evidence showed this was harness/viewport drift:
  - Manual Android launch passed.
  - Product code gates passed.
  - Existing selectors were present in product code.
  - Debug hierarchy showed targets existed or were reachable while Maestro scroll commands failed or overscrolled.
- Additional late failure after a long run was emulator/system-service drift:
  - Android services reported missing `activity`, `package`, `settings`, or `window`.
  - Rebooting the emulator restored API 34 services and manual launch.

### Changed Files
Harness YAML only:
- `maestro/flows/critical/accountant-payment.yaml`
- `maestro/flows/critical/active-context-switch.yaml`
- `maestro/flows/critical/buyer-proposal-review.yaml`
- `maestro/flows/critical/buyer-rfq-create.yaml`
- `maestro/flows/critical/contractor-pdf-smoke.yaml`
- `maestro/flows/critical/contractor-progress.yaml`
- `maestro/flows/critical/director-approve-report.yaml`
- `maestro/flows/critical/director-report-pdf-smoke.yaml`
- `maestro/flows/critical/foreman-draft-submit.yaml`
- `maestro/flows/critical/market-entry.yaml`
- `maestro/flows/critical/office-buyer-route-roundtrip.yaml`
- `maestro/flows/critical/office-safe-entry.yaml`
- `maestro/flows/critical/warehouse-receive-issue.yaml`

### Forbidden Scope Check
- Product files changed beyond original 7: NO
- Product code changed during recovery: NO
- Additional a11y props added during recovery: NO
- Business logic changed: NO
- Callbacks changed: NO
- onPress behavior changed: NO
- Disabled conditions changed: NO
- Validation changed: NO
- SQL/RPC changed: NO
- Runtime/app.json/eas.json/package.json changed: NO
- Release scripts changed: NO
- Critical suite count reduced: NO
- Failing flows deleted/skipped: NO

### Before
- `npm run e2e:maestro:critical`: FAIL
- Failure pattern:
  - `profile-context-office`
  - `profile-open-office-access`
  - `profile-open-market-entry`
  - RFQ `buyer-rfq-email` scroll visibility drift
  - active-context `profile-open-active-context` viewport drift on fresh emulator boot

### Device Recovery
- Emulator rebooted: YES
- Device: `Pixel_7_API_34`
- Android API: `34`
- ABI: `x86_64`
- `font_scale`: `1.0`
- Density: `420`
- Manual app install: PASS
- Manual monkey launch: PASS
- `MainActivity` focused: PASS

### After
- Targeted `Buyer RFQ Create`: PASS
- Targeted `Active Context Switch`: PASS
- Full `npm run e2e:maestro:critical`: PASS
- Final critical result: `14/14` flows passed
- Final report: `artifacts/maestro-critical/report.xml`
- Final report timestamp: `2026-04-27 06:32:35 +06`
- Final suite time: `16m 22s`

### Final Gates
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `git diff --check`: PASS
- Pre-commit `npm run release:verify -- --json`: release subgates PASS, readiness blocked only by dirty worktree before commit

### Release
- OTA disposition: post-commit clean-tree guard required
- OTA published: NO
- EAS build run: NO
- EAS submit run: NO
- Commit created at artifact write time: NO
- Push done at artifact write time: NO
