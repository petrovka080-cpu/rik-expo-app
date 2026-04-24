## WAVE 2B Notes

Status before fix: `NOT GREEN`

Goal:
- Repair the backend warehouse receive RPC chain so `wh_receive_apply_ui` no longer fails on `42883`.

Root causes:
- `public.wh_receive_apply_ui(text, jsonb, text, text, text)` resolved `wh_incoming_items.id` but passed it as `text` into canonical `public.wh_receive_item_v2(...)`, while the canonical function expected `uuid`.
- `public.wh_receive_item_v2(uuid, numeric, text)` already performed the receive mutation but returned with bare `RETURN` statements in a `RETURNS TABLE` function, so wrapper callers saw zero rows and raised `wh_receive_apply_ui_line_failed` after the mutation already happened.

Chosen fix path:
- Preferred canonical-path repair, not a client workaround.
- Migration `20260424150000_warehouse_receive_rpc_chain_fix.sql` keeps `wh_receive_apply_ui` as the bounded wrapper and aligns its internal `v_incoming_item_id` to `uuid`.
- Migration `20260424153000_warehouse_receive_item_v2_return_contract_fix.sql` preserves canonical receive semantics but emits explicit rows for wrapper callers with `RETURN NEXT; RETURN;`.

Scope touched:
- `supabase/migrations/20260424150000_warehouse_receive_rpc_chain_fix.sql`
- `supabase/migrations/20260424153000_warehouse_receive_item_v2_return_contract_fix.sql`
- `tests/warehouse/useWarehouseReceiveApply.test.ts`
- `src/screens/warehouse/warehouseReceiveAtomicBoundaryMigration.test.ts`

Business-semantics guardrails preserved:
- no UI/client workaround
- no Maestro/YAML changes
- no seed helper changes
- no receive status/idempotency rewrite
- no unrelated SQL tables

Regression proof:
- `wh_receive_apply_ui` no longer throws `42883`.
- Receive success path increments `qty_received` and writes exactly one `wh_moves` row.
- Same `client_mutation_id` replays idempotently without duplicate stock movement.
- Invalid purchase item still fails deterministically with `wh_receive_apply_ui_item_not_found`, not transport mismatch.
