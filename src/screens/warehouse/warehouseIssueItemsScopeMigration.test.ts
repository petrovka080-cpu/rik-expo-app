import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260412100000_warehouse_issue_items_scope_v1.sql",
);

describe("warehouse issue items canonical scope migration", () => {
  it("adds a server-owned request issue item payload without local stock materialization", () => {
    const source = fs.readFileSync(migrationPath, "utf8");

    expect(source).toContain("create or replace function public.warehouse_issue_items_scope_v1");
    expect(source).toContain("public.v_wh_issue_req_items_ui");
    expect(source).toContain("'primary_owner', 'rpc_scope_v1'");
    expect(source).toContain("'qty_available', orr.qty_available");
    expect(source).toContain("'qty_can_issue_now', orr.qty_can_issue_now");
    expect(source).toContain("grant execute on function public.warehouse_issue_items_scope_v1(text) to authenticated");
  });
});
