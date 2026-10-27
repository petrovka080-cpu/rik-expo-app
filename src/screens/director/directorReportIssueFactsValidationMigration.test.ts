import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417013000_r2_3_director_issue_facts_validation.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("R2.3 director issue facts validation migration", () => {
  it("adds freshness, fallback, drift, and runtime metrics contracts", () => {
    expect(source).toContain("director_report_issue_facts_runtime_metrics_v1");
    expect(source).toContain("director_report_issue_facts_scope_status_v1()");
    expect(source).toContain("director_report_issue_facts_drift_v1");
    expect(source).toContain("fallback_reason");
    expect(source).toContain("selected_source");
    expect(source).toContain("last_rebuild_duration_ms");
  });

  it("classifies explicit fallback reasons", () => {
    expect(source).toContain("missing_projection");
    expect(source).toContain("version_mismatch");
    expect(source).toContain("stale_projection");
    expect(source).toContain("rebuild_incomplete");
    expect(source).toContain("fresh_projection");
  });

  it("preserves raw fallback and does not build snapshots or rewrite report output", () => {
    expect(source).toContain("raw_fallback:r2_2_issue_fact_v1");
    expect(source).toContain("public.director_report_issue_facts_raw_v1()");
    expect(source).not.toContain("create materialized view");
    expect(source).not.toContain("create or replace function public.director_report_fetch_works_v1");
    expect(source).not.toContain("create or replace function public.director_report_transport_scope_v1");
    expect(source).not.toContain("pdf");
  });

  it("records rebuild started, success, failure, duration, and rows", () => {
    expect(source).toContain("last_rebuild_status = 'started'");
    expect(source).toContain("last_rebuild_status = excluded.last_rebuild_status");
    expect(source).toContain("last_rebuild_status = 'failed'");
    expect(source).toContain("'rebuild_duration_ms'");
    expect(source).toContain("'projected_row_count'");
    expect(source).toContain("raise;");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain("comment on function public.director_report_issue_facts_scope_status_v1");
    expect(source).toContain("grant execute on function public.director_report_issue_facts_drift_v1");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
