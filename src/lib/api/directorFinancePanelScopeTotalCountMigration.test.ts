import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416231500_f1_director_finance_panel_scope_total_count.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("F1 director finance panel scope total-count hardening migration", () => {
  it("targets only the canonical director finance panel read path", () => {
    expect(source).toContain(
      "pg_get_functiondef('public.director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer)'::regprocedure)",
    );
    expect(source).toContain(
      "director_finance_panel_scope_v4 pagination total block did not match expected definition",
    );
    expect(source).toContain("grant execute on function public.director_finance_panel_scope_v4");
    expect(source).not.toContain("create or replace function public.accounting_pay_invoice");
    expect(source).not.toContain("create or replace function public.accountant_proposal_financial_state_v1");
    expect(source).not.toContain("create or replace function public.accountant_inbox_scope_v1");
  });

  it("reuses existing summary count instead of recounting ordered rows", () => {
    expect(source).toContain("'total'', (select count(*)::integer from ordered_rows)");
    expect(source).toContain("'total'', coalesce((select row_count from summary_row), 0)");
  });

  it("preserves release contract metadata", () => {
    expect(source).toContain("comment on function public.director_finance_panel_scope_v4");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
