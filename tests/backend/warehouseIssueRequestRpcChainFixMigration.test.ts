import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260424170000_warehouse_issue_request_rpc_chain_fix.sql",
);

describe("warehouse request issue rpc chain fix migration", () => {
  it("keeps the atomic boundary but aligns internal legacy calls to uuid signatures", () => {
    const source = fs.readFileSync(migrationPath, "utf8");

    expect(source).toContain("create or replace function public.wh_issue_request_atomic_v1");
    expect(source).toContain("wh_issue_request_atomic_v1_idempotency_conflict");
    expect(source).toContain("public.issue_via_ui(");
    expect(source).toContain("p_request_id => v_request_id::uuid");
    expect(source).toContain("public.issue_add_item_via_ui(");
    expect(source).toContain(
      "p_request_item_id => nullif(trim(coalesce(v_line ->> 'request_item_id', '')), '')::uuid",
    );
    expect(source).toContain("public.acc_issue_commit_ledger(p_issue_id => v_issue_id::integer)");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("'idempotent_replay', true");
    expect(source).toContain("'idempotent_replay', false");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source).not.toContain("create or replace function public.issue_via_ui");
    expect(source).not.toContain("create or replace function public.issue_add_item_via_ui");
  });
});
