import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260412101000_warehouse_receive_apply_atomic_boundary_v2.sql",
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
});
