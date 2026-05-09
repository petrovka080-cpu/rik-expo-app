# S Audit Night Battle 135: Buyer Inbox Fallback Observability

## Selected Files
- `src/lib/api/buyer.ts`
- `tests/api/buyerLegacyApiWindow.test.ts`

## Reason Selected
- The next A1/R7 P1 office navigation item was already behavior-covered: the office layout reports both navigate and replace failures through `recordOfficeBackPathFailure`, and `tests/app/office-layout.test.tsx` covers both methods failing.
- The remaining real A1/R7 residual was buyer inbox fallback exhaustion: after the canonical scope RPC and compatibility fallback both failed, the code returned an empty list with only dev logging.
- The safe scope was to preserve the legacy empty-list contract while making the failure production-observable.

## Before
- `listBuyerInbox` recorded only dev warnings when the scope RPC failed and when the request-items compatibility fallback failed.
- If the compatibility fallback also failed, production could see an empty inbox without a structured error/fallback signal.
- The fallback block still used local `any` variables.

## After
- Added `load_buyer_inbox` platform observability around the buyer inbox load.
- Added degraded fallback catch discipline for:
  - `buyer_inbox_scope_rpc_failed`
  - `buyer_inbox_compatibility_fallback_failed`
- Preserved the legacy return behavior: after non-ceiling fallback exhaustion, `listBuyerInbox` still returns `[]`.
- Preserved fail-closed behavior for legacy window ceiling errors.
- Replaced local fallback `any` variables with typed/unknown state.
- Added a contract proving fallback exhaustion emits observability before returning the empty list.

## Gates
- focused tests: PASS
  - `npx jest tests/api/buyerLegacyApiWindow.test.ts tests/api/buyerInboxLegacyApiWindowContract.contract.test.ts tests/api/buyerInboxFullScanSafeRouting.contract.test.ts src/screens/buyer/buyer.observability.test.ts --runInBand`
  - 4 test suites passed; 9 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 666 test suites passed, 1 skipped; 3950 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PASS
  - `npm run release:verify -- --json`
  - timestamp: `2026-05-09T13:52:34.462Z`
  - verified head: `ace55761532453d25eb07374a6b02488a3f6206e`
  - verified origin/main: `ace55761532453d25eb07374a6b02488a3f6206e`
  - sync status: `synced`, ahead/behind `0/0`, readiness `pass`
  - release gates: `tsc`, `expo-lint`, `architecture-anti-regression`, `jest-run-in-band`, `jest`, `git-diff-check`
  - classification: `runtime-ota`, change class `js-logic`, OTA disposition `allow`
  - no deploy or OTA publish was executed

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty-catch additions, TypeScript ignore suppressions, unsafe any-casts, scanner weakening, test deletion, or business-semantic refactor.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
