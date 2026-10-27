import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417003000_r2_2_director_report_issue_facts.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("R2.2 director report normalized issue facts migration", () => {
  it("creates a derived issue-fact layer with rebuild and freshness contracts", () => {
    expect(source).toContain("create table if not exists public.director_report_issue_facts_v1");
    expect(source).toContain("create table if not exists public.director_report_issue_facts_meta_v1");
    expect(source).toContain("create or replace function public.director_report_issue_facts_rebuild_v1()");
    expect(source).toContain("create or replace function public.director_report_issue_facts_freshness_v1()");
    expect(source).toContain("projection_version text not null default 'r2_2_issue_fact_v1'");
    expect(source).toContain("select public.director_report_issue_facts_rebuild_v1();");
  });

  it("switches only the hottest works report consumer to the fact scope", () => {
    expect(source).toContain("create or replace function public.director_report_fetch_works_v1");
    expect(source).toContain("from public.director_report_issue_facts_scope_v1(");
    expect(source).toContain("where p_include_costs");
    expect(source).not.toContain("create or replace function public.director_report_transport_scope_v1");
    expect(source).not.toContain("create or replace function public.director_report_fetch_materials_v1");
    expect(source).not.toContain("create or replace function public.director_report_canonical_decorations_v1");
  });

  it("preserves source-of-truth and report contract boundaries", () => {
    expect(source).toContain("raw fallback");
    expect(source).toContain("Source-of-truth remains warehouse issue/request/naming tables");
    expect(source).toContain("'summary'");
    expect(source).toContain("'works'");
    expect(source).not.toContain("create materialized view");
    expect(source).not.toContain("pdf");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain("comment on function public.director_report_fetch_works_v1");
    expect(source).toContain("grant execute on function public.director_report_fetch_works_v1");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
