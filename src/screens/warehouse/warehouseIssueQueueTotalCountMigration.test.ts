import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416233000_w1_warehouse_issue_queue_total_count.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("W1 warehouse issue queue total-count hardening migration", () => {
  it("targets only the canonical warehouse issue queue read path", () => {
    expect(source).toContain(
      "pg_get_functiondef('public.warehouse_issue_queue_scope_v4(integer,integer)'::regprocedure)",
    );
    expect(source).toContain(
      "warehouse_issue_queue_scope_v4 total_count block did not match expected definition",
    );
    expect(source).toContain("grant execute on function public.warehouse_issue_queue_scope_v4");
    expect(source).not.toContain("create or replace function public.warehouse_issue_post");
    expect(source).not.toContain("create or replace function public.warehouse_receive_confirm");
    expect(source).not.toContain("create or replace function public.warehouse_stock_scope_v2");
  });

  it("counts visible queue rows before sort-only display parsing", () => {
    expect(source).toContain("(select count(*)::integer from sorted_rows) as total_count");
    expect(source).toContain("(select count(*)::integer from visible_queue_rows) as total_count");
  });

  it("preserves release contract metadata", () => {
    expect(source).toContain("comment on function public.warehouse_issue_queue_scope_v4");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
