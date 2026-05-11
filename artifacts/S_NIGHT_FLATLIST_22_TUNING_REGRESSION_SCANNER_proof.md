# S_NIGHT_FLATLIST_22_TUNING_REGRESSION_SCANNER Proof

final_status: GREEN_FLATLIST_TUNING_REGRESSION_SCANNER

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE

## Scope

This wave adds a production-safe scanner ratchet for FlatList/FlashList tuning. It does not change UI runtime behavior, transport, cache, rate-limit, database, Supabase project settings, native build settings, or production mutation routing.

Selected files:

- `scripts/perf/flatListTuningRegression.ts`
- `scripts/architecture_anti_regression_suite.ts`
- `tests/perf/flatListTuningRegressionScanner.contract.test.ts`

Reason selected: `scripts/perf/flatListTuningRegression.ts` owns reusable scanner logic; `scripts/architecture_anti_regression_suite.ts` makes the ratchet part of the required architecture gate; the focused test proves regression behavior for missing `windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `keyExtractor`, and documented exceptions.

## Scanner Contract

The scanner now:

- Scans production runtime JSX list instances in `src` and `app`.
- Counts `FlatList` and `FlashList` separately.
- Requires tuning props for non-allowlisted runtime lists.
- Requires a named stable `keyExtractor` for non-allowlisted runtime lists.
- Fails stale or incomplete allowlist entries.
- Requires every allowlist entry to include owner, reason, and layout proof.
- Keeps nested/report/editor exceptions inventoried instead of silently ignored.

Current scanner metrics:

- Runtime list instances: 60
- FlatList instances: 6
- FlashList instances: 54
- Tuned instances: 27
- Documented allowlist instances: 33
- Editable heavy exceptions: 1
- Violations: 0
- Stale allowlist entries: 0
- Allowlist metadata errors: 0

## Before / After Metrics

| Metric | Before | After |
| --- | --- | --- |
| Architecture FlatList regression check | absent | present |
| Runtime list instances scanned | 0 | 60 |
| FlatList instances counted separately | 0 | 6 |
| FlashList instances counted separately | 0 | 54 |
| Documented allowlist instances | 0 | 33 |
| Editable heavy exceptions | 0 | 1 |
| Undocumented tuning violations | not scanned | 0 |
| Stale allowlist entries | not scanned | 0 |
| Allowlist metadata errors | not scanned | 0 |

## Gates

Preflight:

- `git fetch origin main`: PASS
- `git status --short --branch`: `## main...origin/main`
- `git rev-list --left-right --count HEAD...origin/main`: `0 0`
- Start HEAD: `5cb2edbaa2d232dc4c68a54bb8988c05fbd80e63`
- Worktree clean at start: PASS

Focused tests:

- `npm test -- --runInBand tests/perf/flatListTuningRegressionScanner.contract.test.ts tests/perf/flatListTuningExactCloseout.contract.test.ts`: PASS

Required gates:

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS (`710` passed, `1` skipped test suite; `4161` passed, `1` skipped tests)
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS, including `flatlist_tuning_regression` with `violations: 0`
- `git diff --check`: PASS
- Artifact JSON parse: PASS
- Post-push `npm run release:verify -- --json`: PENDING_POST_PUSH

## Negative Confirmations

- No force push.
- No tags.
- No secrets printed.
- No TypeScript suppression directives added.
- No untyped escape casts added.
- No empty catches added.
- No broad rewrite.
- No Supabase project changes.
- No spend cap changes.
- No Realtime 50K/60K load.
- No destructive or unbounded DML.
- No OTA/EAS/TestFlight/native builds.
- No production mutation route broad enablement.
- No broad cache enablement.
- No broad rate-limit enablement.
