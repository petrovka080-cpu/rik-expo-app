import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260412101000_warehouse_receive_apply_atomic_boundary_v2.sql",
);
const rpcChainFixMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260424150000_warehouse_receive_rpc_chain_fix.sql",
);
const itemReturnContractFixMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260424153000_warehouse_receive_item_v2_return_contract_fix.sql",
);

describe("warehouse receive atomic boundary migration", () => {
  it("replaces receive apply with a deterministic idempotent server boundary", () => {
    const source = fs.readFileSync(migrationPath, "utf8");

    expect(source).toContain("create or replace function public.wh_receive_apply_ui");
    expect(source).toContain("v_normalized_items jsonb");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("wh_receive_apply_ui_idempotency_conflict");
    expect(source).toContain("public.wh_receive_item_v2");
    expect(source).toContain("'idempotent_replay', true");
    expect(source).toContain("'idempotent_replay', false");
    expect(source).toContain("message = 'wh_receive_apply_ui_line_failed'");
    expect(source).toContain("grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated");
  });

  it("aligns apply_ui with the canonical uuid receive function instead of a text mismatch", () => {
    const source = fs.readFileSync(rpcChainFixMigrationPath, "utf8");

    expect(source).toContain("create or replace function public.wh_receive_apply_ui");
    expect(source).toContain("v_incoming_item_id uuid;");
    expect(source).toContain("select wii.id");
    expect(source).not.toContain("select wii.id::text");
    expect(source).toContain("from public.wh_receive_item_v2(");
    expect(source).toContain("p_incoming_item_id => v_incoming_item_id");
    expect(source).toContain("wh_receive_apply_ui_idempotency_conflict");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated");
    expect(source).not.toContain("create or replace function public.wh_receive_item_v2");
  });

  it("keeps canonical wh_receive_item_v2 semantics but emits explicit rows for wrapper callers", () => {
    const source = fs.readFileSync(itemReturnContractFixMigrationPath, "utf8");

    expect(source).toContain("create or replace function public.wh_receive_item_v2(");
    expect(source).toContain("returns table(");
    expect(source).toContain("update public.wh_incoming_items wii");
    expect(source).toContain("insert into public.wh_moves(");
    expect(source).toContain("return next;");
    expect(source).toContain("WAVE 2B return-contract fix");
    expect(source).not.toContain("create or replace function public.wh_receive_apply_ui");
  });
});
