## V4.2 Proof

Start state:
- `git status --short`: clean
- `git rev-parse HEAD`: `a8e2490f2176833dcf5cd49fb778fc2f0712aa79`
- `git rev-parse origin/main`: `a8e2490f2176833dcf5cd49fb778fc2f0712aa79`
- `git diff --check`: pass
- `npm run release:verify -- --json`: pass at wave start

Inventory:
- Canonical active definition found in `supabase/migrations/20260424153000_warehouse_receive_item_v2_return_contract_fix.sql`
- Active wrapper caller found in `supabase/migrations/20260424150000_warehouse_receive_rpc_chain_fix.sql`
- Warehouse security-definer hardening tests already covered wrapper/legacy overloads, but not canonical `wh_receive_item_v2`
- Current live function before rollout:
  - `prosecdef = true`
  - `proconfig = null`
  - `pg_get_functiondef(...)` showed no `SET search_path`

Before:
- `wh_receive_item_v2`: `SECURITY DEFINER`
- `search_path`: not pinned (`proconfig = null`)

After:
- `wh_receive_item_v2`: `SECURITY DEFINER`
- `search_path`: pinned (`proconfig = ["search_path=\"\""]`)
- `pg_get_functiondef(...)` shows `SET search_path TO ''`

Remote rollout:
1. `npx supabase db push --dry-run`
   - Result: would push `20260425061500_wh_receive_item_v2_search_path_fix.sql`
2. `npx supabase db push --yes`
   - Result: blocked by missing `SUPABASE_DB_PASSWORD`
   - Error class: credential / procedural, not SQL logic
3. `npx supabase db query --linked -f supabase/migrations/20260425061500_wh_receive_item_v2_search_path_fix.sql`
   - Result: applied successfully
4. `npx supabase db query --linked "insert into supabase_migrations.schema_migrations(version, name) ..."`
   - Result: remote history synchronized
5. `npx supabase db push --dry-run`
   - Result: `Remote database is up to date.`

Live SQL proof query:
- Command:
  - `npx supabase db query --linked "select p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'wh_receive_item_v2';"`
- Observed:
  - `prosecdef = true`
  - `proconfig = ["search_path=\"\""]`
  - `definition` includes `SECURITY DEFINER` and `SET search_path TO ''`

Regression test proof:
- `npm test -- --runInBand tests/backend/whReceiveItemV2SearchPath.test.ts`
  - pass
- Test coverage inside the file:
  - canonical function only
  - signature/return/body drift guard
  - schema-qualified warehouse references
  - warehouse receive happy path still passes

Gate results:
- `npx tsc --noEmit --pretty false`: pass
- `npx expo lint`: pass
- `npm run verify:warehouse-issue-request-runtime`: pass (`status=passed`, `gate=GREEN`)
- `npm test -- --runInBand`: pass
- `npm test`: pass
- `git diff --check`: pass
- `npm run e2e:maestro:critical`: pass (`8/8 Flows Passed`)

Android emulator proof:
- APK path exists:
  - `android/app/build/outputs/apk/release/app-release.apk`
- `adb install -r android\app\build\outputs\apk\release\app-release.apk`
  - `Success`
- `adb shell am start -W -n com.azisbek_dzhantaev.rikexpoapp/.MainActivity`
  - `Status: ok`
  - `LaunchState: COLD`
- `adb shell pidof com.azisbek_dzhantaev.rikexpoapp`
  - `7812`
- `adb shell dumpsys activity activities ...`
  - `topResumedActivity` and `ResumedActivity` both point to `com.azisbek_dzhantaev.rikexpoapp/.MainActivity`
- Error scan:
  - `NO_FATAL_OR_FINGERPRINT_MATCHES`

Changed files:
- `supabase/migrations/20260425061500_wh_receive_item_v2_search_path_fix.sql`
- `tests/backend/whReceiveItemV2SearchPath.test.ts`

Release verify note:
- `npm run release:verify -- --json` while the worktree is still dirty fails exactly as expected with:
  - `Worktree is dirty. Release automation requires a clean repository state.`
- Final post-push `release:verify` is the last procedural gate after commit/push.
