## WAVE 2B Proof

### Preflight
- `git rev-parse HEAD` == `git rev-parse origin/main` at wave start: `5a0235ee548f19e945f58ed7927d9ccc89dd4d02`
- `git diff --check`: PASS
- worktree then contained only the active in-scope WAVE 2B diff

### Root cause proof
1. `wh_receive_apply_ui` called canonical `public.wh_receive_item_v2(...)` with a `text` incoming-item identifier.
2. Canonical `wh_receive_item_v2` existed with a `uuid` contract, so runtime hit `42883 missing function`.
3. After type-alignment, direct runtime proof showed a second chain bug:
   - `wh_receive_item_v2` mutated stock state
   - wrapper callers saw zero returned rows
   - `wh_receive_apply_ui` raised `wh_receive_apply_ui_line_failed`
4. Cause of the second bug: bare `RETURN` in a `RETURNS TABLE` function instead of emitting a row.

### Fix path
- `20260424150000_warehouse_receive_rpc_chain_fix.sql`
  - keeps `public.wh_receive_apply_ui(...)` as the bounded wrapper
  - changes internal `v_incoming_item_id` to `uuid`
  - delegates to canonical `public.wh_receive_item_v2(...)` without text mismatch
- `20260424153000_warehouse_receive_item_v2_return_contract_fix.sql`
  - keeps canonical receive mutation path
  - adds explicit `RETURN NEXT; RETURN;` in success and zero-take branches
  - preserves note/null/qty semantics

### Migration apply proof
- `npx supabase migration list --linked`: PASS
- `npx supabase db push --linked --dry-run`: PASS
- `npx supabase db push --linked`: PASS
- `npx supabase migration list --linked`: PASS
- Remote sync includes:
  - `20260424150000`
  - `20260424153000`

### Regression proof
- Focused test run:
  - `npm test -- --runInBand tests/warehouse/useWarehouseReceiveApply.test.ts src/screens/warehouse/warehouseReceiveAtomicBoundaryMigration.test.ts`
  - PASS
- Proven behaviors:
  - `wh_receive_apply_ui` success path no longer throws `42883`
  - receive applies through canonical backend path
  - replay with the same mutation id is idempotent
  - invalid payload path stays deterministic with `wh_receive_apply_ui_item_not_found`

### Full gates
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `git diff --check`: PASS

### Release guard
- Pre-commit guard run:
  - `npm run release:preflight -- --json`
  - `npm run release:verify -- --json`
- Result on uncommitted WAVE 2B diff:
  - readiness `fail`
  - `otaDisposition = block`
  - blocker: dirty worktree
- This blocker is from guard discipline, not from the warehouse receive fix itself. Final clean-tree guard verdict must be checked on the release commit.
