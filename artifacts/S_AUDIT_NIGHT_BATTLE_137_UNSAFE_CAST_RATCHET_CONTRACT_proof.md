# S_AUDIT_NIGHT_BATTLE_137_UNSAFE_CAST_RATCHET_CONTRACT

## Result

The architecture anti-regression suite now includes `unsafe_cast_ratchet_contract`.

The contract scans `src`, `app`, and `tests`, but tracks production and test findings separately so test debt cannot hide production growth. It enforces total, per-scope, per-pattern, and critical-folder ratchets.

## Scanner Coverage

- `as_any`
- `ts_ignore`
- `silent_catch`
- `unsafe_unknown_as`

The `unsafe_unknown_as` scanner treats nearby runtime guard evidence as a guarded cast path and otherwise counts the cast against the ratchet.

## Critical Folders

- `src/lib/api`
- `src/lib/auth`
- `src/lib/transport`
- `src/lib/workers`

Current zero targets are locked for `as_any`, `ts_ignore`, and `silent_catch` in every critical folder. `src/lib/auth`, `src/lib/transport`, and `src/lib/workers` are also zero for `unsafe_unknown_as`. Existing `src/lib/api` `unsafe_unknown_as` debt is ratcheted at 27 and cannot increase.

## Before/After Counts

| Bucket | Before | After |
| --- | ---: | ---: |
| total | 192 | 192 |
| production source | 49 | 49 |
| test source | 143 | 143 |
| as_any | 25 | 25 |
| ts_ignore | 6 | 6 |
| silent_catch | 15 | 15 |
| unsafe_unknown_as | 146 | 146 |
| production as_any | 0 | 0 |
| production ts_ignore | 0 | 0 |
| production silent_catch | 0 | 0 |
| production unsafe_unknown_as | 49 | 49 |
| test as_any | 25 | 25 |
| test ts_ignore | 6 | 6 |
| test silent_catch | 15 | 15 |
| test unsafe_unknown_as | 97 | 97 |

## Allowlist Policy

Current allowlist entries: 0.

Any future allowlist entry must include file, line, pattern, reason, owner, and either `expiresAtLocalDate` or `migrationWave`. The scanner fails unused or metadata-incomplete entries.

## Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: PENDING_POST_PUSH

## Safety

No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, or secrets printed.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
