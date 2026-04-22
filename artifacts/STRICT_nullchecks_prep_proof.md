# STRICT_NULLCHECKS_PROGRAM_PREP Proof

## Probe result
- Narrow probe config: `tsconfig.strict-null-prep.json`
- Initial probe blockers: `9`
  - `director_reports.transport.discipline.ts`: 3
  - `directorReportsTransport.service.ts`: 3
  - `warehouse.seed.ts`: 3
- Probe after fixes: `0`

## Focused regression coverage added
- `tests/strict-null/directorReportsTransport.service.test.ts`
  - omitted optional RPC params stay omitted (`undefined`), not `null`
  - explicit scoped params remain unchanged
- `tests/strict-null/warehouse.seed.normalize.test.ts`
  - duplicate purchase-item rows merge deterministically
  - code-based merge fallback remains deterministic when purchase item id is absent

## Full gate results
- `npx tsc --project tsconfig.strict-null-prep.json --pretty false` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS

## Runtime semantics
- Full-success semantics unchanged for all touched paths.
- Director report transport still sends the same explicit filter values when present.
- Warehouse seed duplicate merge still sums `qty_expected` by the same key strategy.

## Android emulator proof
- Emulator device detected: `emulator-5554`
- Bounded smoke attempt performed with one environment-only recovery path:
  - app package launched
  - existing Android harness started dev-client Metro
  - reverse proxy ready
  - deep-link project open attempted
  - temporary local junction exposed the expected `rik-expo-app` path segment for the dev client
- Result: `PASS`

### Why the recovery was needed
- The first emulator attempt hit a dev-client bundle path mismatch in the clean release worktree:
  - `There was a problem loading the project.`
  - `404 ... /rik-expo-app/node_modules/expo-router/entry.bundle`
- This was an environment/runtime-worktree path expectation issue, not a product regression from the strict-null prep changes.
- After the bounded local junction recovery, the emulator reached the app runtime successfully and the temporary junction was removed.

### Android proof artifacts
- `artifacts/strict-null-prep-android-runtime.json`
- `artifacts/strict-null-prep-runtime-5.xml`
- `artifacts/strict-null-prep-runtime-5.png`
- `artifacts/strict-null-prep-devclient.stdout.log`
- `artifacts/strict-null-prep-devclient.stderr.log`

## Wave status assessment
- Code and test gates are GREEN.
- Android emulator proof is GREEN after one bounded environment-only recovery, with no product-code changes required for the proof.
- This wave is technically ready for release tail once the final clean-worktree check passes after staging the exact touched files.
