import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417052000_r3_d_director_report_options_cpu_elimination.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const lowerSource = source.toLowerCase();

const extractFunction = (functionName: string): string => {
  const signature = `create or replace function public.${functionName}`;
  const start = lowerSource.indexOf(signature.toLowerCase());
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lowerSource.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return lowerSource.slice(start, end);
};

describe("R3.D director report options CPU elimination migration", () => {
  it("adds a row-level options projection with rebuild metadata", () => {
    expect(source).toContain(
      "create table if not exists public.director_report_options_facts_v1",
    );
    expect(source).toContain("issue_item_id text primary key");
    expect(source).toContain("object_name_canonical text not null");
    expect(source).toContain("object_id_resolved text");
    expect(source).toContain("sort_ord bigint not null");
    expect(source).toContain(
      "create table if not exists public.director_report_options_facts_meta_v1",
    );
    expect(source).toContain(
      "create or replace function public.director_report_options_facts_rebuild_v1()",
    );
    expect(source).toContain("delete from public.director_report_options_facts_v1");
    expect(source).toContain("where true;");
  });

  it("keeps legacy parsing only in build/projection source", () => {
    const sourceFunction = extractFunction("director_report_options_facts_source_v1()");
    const buildSource = extractFunction("director_report_fetch_options_build_source_v1(");

    expect(sourceFunction).toContain("substring(");
    expect(sourceFunction).toContain("regexp_replace(");
    expect(sourceFunction).toContain("без объекта");
    expect(sourceFunction).toContain("подтверждено");
    expect(sourceFunction).toContain("объект");
    expect(sourceFunction).toContain("контекст");
    expect(buildSource).toContain("from public.director_report_options_facts_source_v1() f");
  });

  it("removes runtime parsing from the public options RPC", () => {
    const publicOptions = extractFunction("director_report_fetch_options_v1(");

    expect(publicOptions).toContain("from public.director_report_options_facts_v1 f");
    expect(publicOptions).toContain("'objects'");
    expect(publicOptions).toContain("'objectidbyname'");
    expect(publicOptions).not.toContain("substring(");
    expect(publicOptions).not.toContain("regexp_replace(");
    expect(publicOptions).not.toContain("regexp_match(");
    expect(publicOptions).not.toContain("director_report_fetch_materials_v1");
    expect(publicOptions).not.toContain("director_report_fetch_works_v1");
  });

  it("captures old output before replacement and proves old-vs-new parity", () => {
    expect(source).toContain("create temp table r3_d_options_before");
    expect(source).toContain("create temp table r3_d_options_build_before");
    expect(source).toContain("create temp table r3_d_options_after");
    expect(source).toContain("R3.D director report options build source parity failed");
    expect(source).toContain("R3.D director report options public parity failed");
    expect(source).toContain("director_report_options_r3d_parity_v1");
    expect(source).toContain("'diff_count'");
    expect(source).toContain("'is_drift_free'");
  });

  it("adds a CPU proof helper tied to the public function definition", () => {
    const cpuProof = extractFunction("director_report_options_r3d_cpu_proof_v1()");

    expect(cpuProof).toContain("p.proname = 'director_report_fetch_options_v1'");
    expect(cpuProof).toContain("'options_has_substring'");
    expect(cpuProof).toContain("'options_has_regexp_replace'");
    expect(cpuProof).toContain("'options_has_regexp_match'");
    expect(cpuProof).toContain("'options_reads_projection'");
    expect(cpuProof).toContain("'build_source_exists'");
  });

  it("does not rewrite transport, report, snapshot, PDF, finance, or warehouse functions", () => {
    expect(source).not.toContain(
      "create or replace function public.director_report_transport_scope_v1",
    );
    expect(source).not.toContain(
      "create or replace function public.director_report_fetch_materials_v1",
    );
    expect(source).not.toContain(
      "create or replace function public.director_report_fetch_works_v1",
    );
    expect(source).not.toContain("create or replace function public.warehouse_");
    expect(lowerSource).not.toContain("finance");
    expect(lowerSource).not.toContain("pdf");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain(
      "comment on function public.director_report_fetch_options_v1(date, date)",
    );
    expect(source).toContain(
      "grant execute on function public.director_report_fetch_options_v1(date, date) to authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.director_report_options_r3d_cpu_proof_v1() to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
