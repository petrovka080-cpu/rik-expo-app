import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417050000_r3_b_director_issue_facts_raw_cpu_elimination.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

const safeDeleteMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417050500_r3_b_director_issue_facts_rebuild_safe_delete.sql",
);

const safeDeleteSource = fs.readFileSync(safeDeleteMigrationPath, "utf8");

const extractFunction = (functionName: string): string => {
  const signature = `create or replace function public.${functionName}`;
  const start = source.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end).toLowerCase();
};

describe("R3.B director issue facts raw CPU elimination migration", () => {
  it("splits public raw runtime from the legacy build source", () => {
    expect(source).toContain(
      "alter function public.director_report_issue_facts_raw_v1()",
    );
    expect(source).toContain(
      "rename to director_report_issue_facts_build_source_v1",
    );
    expect(source).toContain(
      "from public.director_report_issue_facts_build_source_v1() f",
    );
    expect(source).toContain(
      "revoke all on function public.director_report_issue_facts_build_source_v1() from authenticated",
    );
  });

  it("removes substring and regexp_replace from the public raw function body", () => {
    const rawFunction = extractFunction("director_report_issue_facts_raw_v1()");

    expect(rawFunction).toContain("from public.director_report_issue_facts_v1 f");
    expect(rawFunction).not.toContain("substring(");
    expect(rawFunction).not.toContain("regexp_replace(");
    expect(rawFunction).not.toContain("warehouse_issue_items");
    expect(rawFunction).not.toContain("warehouse_issues");
  });

  it("keeps rebuild and drift proof tied to the preserved source semantics", () => {
    const rebuildFunction = extractFunction("director_report_issue_facts_rebuild_v1()");
    const driftFunction = extractFunction("director_report_issue_facts_drift_v1(");

    expect(rebuildFunction).toContain(
      "from public.director_report_issue_facts_build_source_v1() f",
    );
    expect(rebuildFunction).not.toContain(
      "from public.director_report_issue_facts_raw_v1() f",
    );
    expect(driftFunction).toContain(
      "from public.director_report_issue_facts_build_source_v1() f",
    );
    expect(driftFunction).toContain(
      "'comparison_source', 'director_report_issue_facts_build_source_v1'",
    );
  });

  it("keeps rebuild callable under guarded remote execution", () => {
    expect(safeDeleteSource).toContain(
      "create or replace function public.director_report_issue_facts_rebuild_v1()",
    );
    expect(safeDeleteSource).toContain(
      "delete from public.director_report_issue_facts_v1",
    );
    expect(safeDeleteSource).toContain("where true;");
    expect(safeDeleteSource).toContain(
      "from public.director_report_issue_facts_build_source_v1() f",
    );
    expect(safeDeleteSource).toContain("select public.director_report_issue_facts_rebuild_v1();");
    expect(safeDeleteSource).toContain("'delete_guard', 'where true'");
  });

  it("adds apply-time and runtime parity proof without comparing projected_at", () => {
    expect(source).toContain("r3_b_issue_facts_raw_before");
    expect(source).toContain("r3_b_issue_facts_raw_after");
    expect(source).toContain("R3.B director issue facts raw parity failed");
    expect(source).toContain("director_report_issue_facts_r3b_parity_v1");
    expect(source).toContain("director_report_issue_facts_r3b_cpu_proof_v1");

    const beforeProjection = source.slice(
      source.indexOf("create temp table r3_b_issue_facts_raw_before"),
      source.indexOf("from public.director_report_issue_facts_raw_v1();"),
    );
    expect(beforeProjection).not.toContain("projected_at");
  });

  it("does not rewrite consuming report, snapshot, PDF, finance, or warehouse paths", () => {
    expect(source).not.toContain(
      "create or replace function public.director_report_fetch_works_v1",
    );
    expect(source).not.toContain(
      "create or replace function public.director_report_fetch_works_from_facts_v1",
    );
    expect(source).not.toContain(
      "create or replace function public.director_report_transport_scope_v1",
    );
    expect(source).not.toContain("create materialized view");
    expect(source.toLowerCase()).not.toContain("pdf");
    expect(source.toLowerCase()).not.toContain("finance");
    expect(source).not.toContain("warehouse_stock");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain(
      "comment on function public.director_report_issue_facts_raw_v1()",
    );
    expect(source).toContain(
      "grant execute on function public.director_report_issue_facts_r3b_cpu_proof_v1() to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
