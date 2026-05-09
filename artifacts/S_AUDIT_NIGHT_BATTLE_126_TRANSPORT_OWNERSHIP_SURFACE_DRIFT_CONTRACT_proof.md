# S_AUDIT_NIGHT_BATTLE_126_TRANSPORT_OWNERSHIP_SURFACE_DRIFT_CONTRACT

## Selection

- Selected `tests/architecture/transportOwnershipMap.test.ts`.
- Reason: the existing ownership-map contract verified transport owner files and production-safety wording, but did not verify scanner baseline counts or provider surface counts. A new provider call in an existing transport file could make `docs/architecture/transport_ownership_map.md` stale without failing the focused contract.

## Before

- Worktree was clean and `HEAD` matched `origin/main` at `22fd6a2d640d7ad5235012baacd3012db6c4f63c`.
- Fresh scanner was green: service bypass findings `0`, service bypass files `0`, transport-controlled findings `175`, unclassified current findings `0`.
- Ownership map file-list lock existed, but provider surface count drift was not contract-tested.

## After

- The ownership-map contract now derives scanner totals and per-surface counts from `scanDirectSupabaseBypasses`.
- It verifies the document baseline totals, transport-owned file count, service bypass file count, test-only count, generated-or-ignored count, and each provider surface summary line.
- Locked provider surfaces: auth, read, realtime, rpc, storage, write.
- No runtime code or production behavior changed.

## Focused Verification

- `npx jest tests/architecture/transportOwnershipMap.test.ts --runInBand` passed: 1 suite, 3 tests.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json` passed with service bypass findings `0`, service bypass files `0`, transport-controlled findings `175`, unclassified current findings `0`.
- `npx tsc --noEmit --pretty false` passed.
- `npx expo lint` passed.
- `npm test -- --runInBand` passed: 659 suites passed, 1 skipped; 3912 tests passed, 1 skipped.
- `git diff --check` passed before artifact status finalization and will be re-run before commit.

## Safety

- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printing, scanner/test/lint weakening, test deletion for green, or business semantics refactor.
- Supabase Realtime status remains `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`.
