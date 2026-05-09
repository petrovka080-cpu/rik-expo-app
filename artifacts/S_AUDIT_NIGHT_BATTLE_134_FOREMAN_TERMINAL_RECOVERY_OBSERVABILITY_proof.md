# S Audit Night Battle 134: Foreman Terminal Recovery Observability

## Selected Files
- `tests/foreman/foreman.draftBoundary.recovery.test.ts`
- `tests/foreman/foreman.draftBoundary.telemetry.test.ts`

## Reason Selected
- `artifacts/A1_R7_errors.md` still listed Foreman terminal recovery remote-status inspection as a P1 silent-failure risk.
- Fresh read showed production code already reports `terminal_recovery_remote_check_failed` through the Foreman draft boundary failure reporter.
- The safe scope was to lock that behavior with focused contracts and avoid touching production runtime code.

## Before
- Source guards proved the event name existed, and restore remote-check failures had behavior coverage.
- There was no direct behavior contract proving terminal recovery remote-check failure keeps the recovery owner for retry and reports the degraded fallback.

## After
- Added a recovery contract for `runForemanClearTerminalRecoveryOwnerIfNeeded` proving:
  - failed remote inspection reports `terminal_recovery_remote_check_failed`
  - the recovery owner remains for the next check
  - terminal local cleanup is not run after a failed inspection
- Added a telemetry-owner contract proving the degraded fallback records:
  - `screen: "foreman"`
  - `surface: "draft_boundary"`
  - `sourceKind: "rpc:fetch_request_details"`
  - `errorStage: "recovery"`
  - `trigger: "bootstrap_complete"`
  - candidate request/source context and retry metadata
- Production Foreman recovery code was not changed.

## Gates
- focused tests: PASS
  - `npx jest tests/foreman/foreman.draftBoundary.recovery.test.ts tests/foreman/foreman.draftBoundary.telemetry.test.ts src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts tests/foreman/foreman.draftBoundary.runtimeSubscriptions.test.ts --runInBand`
  - 4 test suites passed; 19 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 666 test suites passed, 1 skipped; 3949 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PASS
  - `npm run release:verify -- --json`
  - verified pushed commit `1dbe05dd572f33cae7c558b4b17552d1623212f6` matched `origin/main`, sync status `synced`
  - OTA disposition: skip, non-runtime test/proof-only change
  - release gates passed: tsc, expo-lint, architecture-anti-regression, jest-run-in-band, jest, git-diff-check

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty-catch additions, TypeScript ignore suppressions, unsafe any-casts, scanner weakening, test deletion, or business-semantic refactor.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
