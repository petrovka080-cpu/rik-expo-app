import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416230000_c2_director_report_works_price_scope_gating.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("C2 director report works price scope gating migration", () => {
  it("hardens only the director_report_fetch_works_v1 hot path", () => {
    expect(source).toContain(
      "pg_get_functiondef('public.director_report_fetch_works_v1(date,date,text,boolean)'::regprocedure)",
    );
    expect(source).toContain(
      "director_report_fetch_works_v1 price_scope block did not match expected definition",
    );
    expect(source).toContain(
      "grant execute on function public.director_report_fetch_works_v1(date, date, text, boolean) to authenticated",
    );
    expect(source).not.toContain("create or replace function public.director_report_transport_scope_v1");
    expect(source).not.toContain("create or replace function public.director_report_fetch_materials_v1");
  });

  it("keeps no-cost report semantics while avoiding price table fan-in", () => {
    expect(source).toContain("case when p_include_costs then (");
    expect(source).toContain("else '{}'::text[] end");
    expect(source).toContain("where p_include_costs");
    expect(source).toContain("public.director_report_fetch_issue_price_scope_v1");
  });

  it("preserves release contract metadata", () => {
    expect(source).toContain("comment on function public.director_report_fetch_works_v1");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
