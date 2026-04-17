import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417051000_r3_c_warehouse_issue_queue_cpu_elimination.sql",
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

describe("R3.C warehouse issue queue CPU elimination migration", () => {
  it("preserves the legacy queue scope as a proof-only build source", () => {
    expect(source).toContain(
      "alter function public.warehouse_issue_queue_scope_v4(integer, integer)",
    );
    expect(source).toContain(
      "rename to warehouse_issue_queue_scope_v4_build_source_v1",
    );
    expect(source).toContain(
      "revoke all on function public.warehouse_issue_queue_scope_v4_build_source_v1(integer, integer) from authenticated",
    );
    expect(source).toContain(
      "comment on function public.warehouse_issue_queue_scope_v4_build_source_v1(integer, integer)",
    );
  });

  it("adds a prepared request-context projection and rebuild metadata", () => {
    expect(source).toContain(
      "create table if not exists public.warehouse_issue_queue_context_v1",
    );
    expect(source).toContain("contractor_name text");
    expect(source).toContain("contractor_phone text");
    expect(source).toContain("planned_volume text");
    expect(source).toContain("display_year integer not null default 0");
    expect(source).toContain("display_seq integer not null default 0");
    expect(source).toContain(
      "create table if not exists public.warehouse_issue_queue_context_meta_v1",
    );
    expect(source).toContain(
      "create or replace function public.warehouse_issue_queue_context_rebuild_v1()",
    );
    expect(source).toContain(
      "delete from public.warehouse_issue_queue_context_v1",
    );
    expect(source).toContain("where true;");
  });

  it("keeps regex parsing only in the rebuild/proof source, not public runtime", () => {
    const contextSource = extractFunction("warehouse_issue_queue_context_source_v1()");
    const publicScope = extractFunction("warehouse_issue_queue_scope_v4(");

    expect(contextSource).toContain("substring(");
    expect(contextSource).toContain("regexp_replace(");
    expect(contextSource).toContain("regexp_match(");

    expect(publicScope).toContain("warehouse_issue_queue_context_v1 ctx");
    expect(publicScope).toContain("ctx.contractor_name");
    expect(publicScope).toContain("ctx.contractor_phone");
    expect(publicScope).toContain("ctx.planned_volume");
    expect(publicScope).toContain("ctx.display_year");
    expect(publicScope).toContain("ctx.display_seq");
    expect(publicScope).not.toContain("substring(");
    expect(publicScope).not.toContain("regexp_replace(");
    expect(publicScope).not.toContain("regexp_match(");
  });

  it("preserves queue output shape and W1 total-count semantics", () => {
    const publicScope = extractFunction("warehouse_issue_queue_scope_v4(");

    expect(publicScope).toContain("'document_type', 'warehouse_issue_queue_scope'");
    expect(publicScope).toContain("'version', 'v4'");
    expect(publicScope).toContain("'rows_source', 'warehouse_issue_queue_scope_v4'");
    expect(publicScope).toContain("(select count(*)::integer from visible_queue_rows) as total_count");
    expect(publicScope).not.toContain("(select count(*)::integer from sorted_rows) as total_count");
    expect(publicScope).toContain("order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc");
  });

  it("adds runtime proof helpers for CPU removal and old-vs-new parity", () => {
    expect(source).toContain("warehouse_issue_queue_r3c_cpu_proof_v1");
    expect(source).toContain("warehouse_issue_queue_r3c_parity_v1");
    expect(source).toContain("'scope_has_substring'");
    expect(source).toContain("'scope_has_regexp_replace'");
    expect(source).toContain("'scope_has_regexp_match'");
    expect(source).toContain("public.warehouse_issue_queue_scope_v4_build_source_v1(p_offset, p_limit)");
    expect(source).toContain("public.warehouse_issue_queue_scope_v4(p_offset, p_limit)");
    expect(source).toContain("'diff_count'");
    expect(source).toContain("select public.warehouse_issue_queue_context_rebuild_v1();");
    expect(source).toContain("R3.C warehouse issue queue parity failed");
  });

  it("does not touch write paths, stock scope, finance, UI, or PDF contracts", () => {
    expect(lowerSource).not.toContain("create or replace function public.warehouse_issue_post");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_receive_confirm");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("director_finance");
    expect(lowerSource).not.toContain("pdf");
    expect(lowerSource).not.toContain("react");
  });

  it("restores grants and schema reload metadata", () => {
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_r3c_cpu_proof_v1() to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
