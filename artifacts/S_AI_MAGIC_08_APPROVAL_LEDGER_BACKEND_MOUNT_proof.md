# S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_CONTRACT

Final runtime status: `BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED`.

Contract status: `GREEN_AI_APPROVAL_LEDGER_BACKEND_MOUNT_CONTRACT_READY`.

## What Changed

- Added a backend-owned RPC adapter for the persistent AI action ledger.
- Wired action-ledger BFF and Approval Inbox runtime to mount the RPC backend from server-resolved `organizationId`, `userId`, and role scope.
- Added an additive SQL proposal for write RPCs: submit pending action, find by idempotency key, list by organization, approve, and reject.
- Kept domain execution blocked unless a real domain executor is mounted.
- Added contract tests and architecture scanner ratchets.

## Safety

- No hook work.
- No UI decomposition.
- No fake local approval.
- No fake action status.
- No fake execution.
- No direct mutation from UI.
- No direct Supabase from UI.
- No model provider import from UI.
- No raw DB rows in AI payload.
- No raw prompt/provider payload stored.
- No Auth Admin, no listUsers, no service_role usage added.
- No DB seed.
- No production env mutation.
- No migration applied.
- No OTA, no iOS build, no Android Play submit.
- No credentials in source, CLI args, or artifacts.

## Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- targeted Jest for RPC backend/migration/architecture: PASS
- full `npm test -- --runInBand`: PASS, 885 suites passed, 1 skipped; 4646 tests passed, 1 skipped
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- `npx tsx scripts/release/verifyAndroidInstalledBuildRuntime.ts`: PASS

## Runtime Blockers

- `BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED`: the write RPC proposal was not applied because production migration approval was not explicitly granted.
- `BLOCKED_ANDROID_APK_BUILD_FAILED`: EAS Android build quota is exhausted until 2026-06-01.
- Existing installed Android runtime smoke still passes.
