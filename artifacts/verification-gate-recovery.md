# Verification Gate Recovery

## Result
- Status: `GREEN`
- Purpose: restore runnable local proof environment without changing product semantics

## What was broken
- `node_modules` install state was incomplete even though `package-lock.json` already pinned the needed packages.
- Jest bootstrap failed before running suites because `@jest/core` was physically missing.
- Expo/web smoke bootstrap failed earlier because `@expo/schema-utils` and other declared packages were physically missing.
- TypeScript proof gate was blocked by `TS5097` on explicit `.ts` imports used by the repo's shared PDF modules.
- The local role smoke script could write a `GREEN` artifact and still hang on Windows because `SIGTERM` on `cmd.exe` did not kill the Expo child tree.

## Exact fixes
- Restored install state from the existing lockfile with `npm ci --no-audit --no-fund`.
- Added global Jest setup in `jest.setup.js` to mock AsyncStorage through the package's canonical Jest mock.
- Wired that setup in `jest.config.js`.
- Enabled `allowImportingTsExtensions` in `tsconfig.json` so repo-owned explicit `.ts` imports stop breaking `tsc --noEmit`.
- Hardened `scripts/local_role_screen_access_verify.ts` and `scripts/director_dev_local_access_bootstrap.ts` to stop the spawned Expo process tree on Windows with `taskkill /T /F`.
- Extended `scripts/local_role_screen_access_verify.ts` to cover `/profile` in addition to the role screens.

## Runnable proof
- Jest:
  - `artifacts/wave2-silent-failure-jest.json`
  - 4 suites passed, 10 tests passed
- TypeScript:
  - `node node_modules/typescript/bin/tsc --noEmit --pretty false`
  - passed
- Web smoke:
  - `artifacts/local-role-screen-access-proof.json`
  - `artifacts/local-role-screen-access-proof.md`
  - `/director`, `/buyer`, `/accountant`, `/warehouse`, `/contractor`, `/profile` all opened in local/dev without redirect
  - production redirect policy remained preserved

## Scope guard
- No feature code, business logic, offline semantics, RBAC, navigation semantics, or product UI flows were changed.
- This batch touched verification/tooling/config only.
