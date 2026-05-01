import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
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

describe("S-LOAD-11 warehouse issue queue ready rows read model", () => {
  it("adds a versioned ready-rows projection and preserves the previous source as a builder", () => {
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain(
      "alter function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(source).toContain("rename to warehouse_issue_queue_scope_v4_build_ready_rows_source_v1");
    expect(source).toContain("create table if not exists public.warehouse_issue_queue_ready_rows_v1");
    expect(source).toContain("request_id text primary key");
    expect(source).toContain("source_ordinality integer not null");
    expect(source).toContain("row_value jsonb not null");
    expect(source).toContain("create table if not exists public.warehouse_issue_queue_ready_rows_meta_v1");
    expect(source).toContain("idx_warehouse_issue_queue_ready_rows_order_v1");
  });

  it("keeps the public wrapper boundary and replaces only the source helper", () => {
    expect(source).not.toContain("create or replace function public.warehouse_issue_queue_scope_v4(");
    expect(source).toContain(
      "create or replace function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(",
    );
    expect(source).toContain(
      "revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated",
    );
  });

  it("makes runtime source read projected rows without live truth views or request_items", () => {
    const runtimeSource = extractFunction("warehouse_issue_queue_scope_v4_source_before_sloadfix4(");

    expect(runtimeSource).toContain("from public.warehouse_issue_queue_ready_rows_v1 rr");
    expect(runtimeSource).toContain("from public.warehouse_issue_queue_ready_rows_meta_v1 m");
    expect(runtimeSource).toContain("order by source_ordinality asc, request_id desc");
    expect(runtimeSource).toContain("limit (select limit_value from normalized_args)");
    expect(runtimeSource).toContain("'rows_source', 'warehouse_issue_queue_scope_v4'");
    expect(runtimeSource).toContain("'total', (select total_count from meta_stats)");
    expect(runtimeSource).toContain("'row_count', (select row_count from meta_stats)");
    expect(runtimeSource).toContain("'has_more'");
    expect(runtimeSource).toContain("'ui_truth_request_count'");
    expect(runtimeSource).toContain("'fallback_truth_request_count'");
    expect(runtimeSource).not.toContain("v_wh_issue_req_heads_ui");
    expect(runtimeSource).not.toContain("v_wh_issue_req_items_ui");
    expect(runtimeSource).not.toContain("v_warehouse_stock");
    expect(runtimeSource).not.toContain("request_items");
    expect(runtimeSource).not.toContain("fallback_truth_by_req");
    expect(runtimeSource).not.toContain("merged_truth");
  });

  it("adds rebuild, status, parity, and proof helpers with sanitized evidence only", () => {
    const rebuildSource = extractFunction("warehouse_issue_queue_ready_rows_rebuild_v1()");
    const paritySource = extractFunction("warehouse_issue_queue_ready_rows_parity_v1(");
    const proofSource = extractFunction("warehouse_issue_queue_ready_rows_read_model_proof_v1()");

    expect(rebuildSource).toContain(
      "warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(0, 1000000)",
    );
    expect(rebuildSource).toContain("jsonb_array_elements(coalesce(v_payload -> 'rows', '[]'::jsonb))");
    expect(rebuildSource).toContain("last_rebuild_error = sqlstate");
    expect(paritySource).toContain("md5(src.row_value::text) as row_hash");
    expect(paritySource).toContain("'row_diff_count'");
    expect(paritySource).toContain("'meta_hash_equal'");
    expect(proofSource).toContain("'runtime_source_avoids_live_heads_view'");
    expect(proofSource).toContain("'runtime_source_avoids_live_items_view'");
    expect(proofSource).toContain("'runtime_source_avoids_stock_view'");
    expect(proofSource).toContain("'runtime_source_avoids_request_items'");
  });

  it("runs an initial rebuild and proof check without production/provider/mobile changes", () => {
    expect(source).toContain("select public.warehouse_issue_queue_ready_rows_rebuild_v1();");
    expect(source).toContain("select public.warehouse_issue_queue_ready_rows_read_model_proof_v1()");
    expect(source).toContain("select public.warehouse_issue_queue_ready_rows_status_v1()");
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(lowerSource).not.toContain("production");
    expect(lowerSource).not.toContain("service_role");
    expect(lowerSource).not.toContain("staging_supabase");
    expect(lowerSource).not.toContain("render_deploy");
    expect(lowerSource).not.toContain("expo_public");
    expect(lowerSource).not.toContain("redis");
    expect(lowerSource).not.toContain("bullmq");
    expect(lowerSource).not.toContain("rate enforcement enabled");
  });
});
