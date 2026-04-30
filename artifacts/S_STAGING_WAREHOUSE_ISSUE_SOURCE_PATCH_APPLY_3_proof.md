# S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-3 Proof

Status: `GREEN_STAGING_SOURCE_APPLIED`

Applied exactly this committed S-LOAD-FIX-6 migration to staging:

`supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql`

Commit: `c3d1ba3eae9f99b5c69565a234773b8910abdd66`

## Preflight

- `HEAD == origin/main`: yes
- worktree clean before apply: yes
- `.env.staging.local` ignored: yes
- `STAGING_SUPABASE_DB_URL` present: yes, value not printed
- DB host class: `supabase_session_pooler`
- DB connection: yes
- migration history readable: yes
- production selected: no
- migration file exists: yes

## Before Apply

Captured sanitized source identity only:

- public wrapper exists: yes
- source function exists: yes
- public wrapper SHA256: `ee297d6b05d058af71cfe4afb51a65138c09164f41844f413da1c6387d019eb8`
- source function SHA256: `9e7dbfce68887abd03c77b36f075112d7e980ee940d8866a625aed99afe1b5da`
- exact-count path present: yes
- Fix-5 lower-bound path present: no
- raw function source stored: no
- raw row payloads stored: no

Migration history did not include `20260430143000` before this wave.

## Dry Run

Dry-run executed in a transaction and was rolled back.

- dry-run ok: yes
- source hash unchanged after rollback: yes
- error: none

## Staging Apply

Applied the migration body to staging and recorded migration history version `20260430143000`.

- target: staging
- production touched: no
- only requested migration applied: yes
- migration history includes `20260430143000`: yes
- source hash changed: yes
- source materialization active: yes
- exact-count path preserved: yes
- Fix-5 lower-bound probe not reintroduced: yes

PostgreSQL emitted notice code `42622` because the proof-helper identifier is longer than 63 bytes and is truncated by PostgreSQL. The helper exists under the truncated identifier and passed all safety booleans.

## Targeted Smoke

Target:

`warehouse_issue_queue_scope_v4(0, 25)`

Result:

- rows returned: `25`
- rows within requested limit: yes
- `meta.row_count`: `25`
- `meta.row_count <= 25`: yes
- `meta.has_more` exists: yes
- `meta.has_more` type: `boolean`
- timeout `57014`: no
- raw payload printed: no

## Sanitized EXPLAIN

Captured one read-only sanitized post-apply EXPLAIN timing for:

`select public.warehouse_issue_queue_scope_v4(0, 25)`

- EXPLAIN available: yes
- execution time: `544.545ms`
- planning time: `0.022ms`
- top node: `Result`
- timeout `57014`: no
- raw plan printed: no

## Safety

- production touched: NO
- staging touched: YES
- staging DDL/migration applied: YES
- production DDL/migration applied: NO
- business data writes: NO
- load tests run: NO
- S-LOAD-8 run: NO
- service-role used: NO
- package/native config changed: NO
- business logic changed: NO
- visibility semantics changed: NO
- warehouse stock math changed: NO
- BFF/Redis/Queue work touched: NO
- OTA/EAS/Play Market touched: NO
- raw env values printed/committed: NO
- raw rows or payloads printed/committed: NO
- readiness claimed: NO

Next required wave: `S-LOAD-8 POST-S-LOAD-FIX-6 STAGING REGRESSION`.
