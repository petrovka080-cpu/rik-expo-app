import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
);

const matrixPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_6_warehouse_issue_explain_index_plan_matrix.json",
);

const proofPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_6_warehouse_issue_explain_index_plan_proof.md",
);

const readSource = (filePath: string) => fs.readFileSync(filePath, "utf8");

const source = readSource(migrationPath);
const lowerSource = source.toLowerCase();

describe("S-LOAD-FIX-6 warehouse issue queue explain/index plan patch", () => {
  it("patches only the private warehouse issue queue source behind the bounded public wrapper", () => {
    expect(source).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(source).toContain("pg_get_functiondef(");
    expect(source).toContain("execute v_next");
    expect(source).not.toContain("alter function public.warehouse_issue_queue_scope_v4(integer, integer)");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.buyer_summary_inbox_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.buyer_summary_buckets_scope_v1");
    expect(lowerSource).not.toContain("warehouse_issue_post");
  });

  it("pushes expensive head and item truth reads down to visible request ids", () => {
    expect(source).toContain("from public.v_wh_issue_req_heads_ui v");
    expect(source).toContain("from public.v_wh_issue_req_items_ui v");
    expect(source).toContain("join visible_requests vr");
    expect(source).toContain("on vr.request_id = trim(coalesce(v.request_id::text, ''))");
    expect(source).toContain("'source_scopes_head_view_to_visible_requests'");
    expect(source).toContain("'source_scopes_ui_item_truth_to_visible_requests'");
  });

  it("does not reintroduce the timeout-prone Fix-5 lower-bound total pattern", () => {
    expect(source).toContain("(select count(*)::integer from visible_queue_rows) as total_count");
    expect(source).not.toContain("sorted_probe_rows as (");
    expect(source).not.toContain("sorted_probe_rows as materialized");
    expect(source).not.toContain("'total_exact', false");
    expect(source).not.toContain("'total_kind', 'lower_bound'");
    expect(source).toContain("'source_does_not_reintroduce_fix5_lower_bound_probe'");
  });

  it("preserves row order, page bound, meta shape, and warehouse stock truth path", () => {
    expect(source).toContain("order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc");
    expect(source).toContain(
      "order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc",
    );
    expect(source).toContain("limit (select limit_value from normalized_args)");
    expect(source).toContain("'source_preserves_meta_shape'");
    expect(source).toContain("'''total'', (select total_count from meta_stats)");
    expect(source).toContain("'''row_count'', (select row_count from meta_stats)");
    expect(source).toContain("'''has_more'''");
    expect(source).toContain("'''ui_truth_request_count'''");
    expect(source).toContain("'''fallback_truth_request_count'''");
    expect(source).toContain("from public.v_warehouse_stock vs");
    expect(source).toContain("stock_by_code as");
    expect(source).toContain("stock_by_code_uom as");
  });

  it("adds a narrow proof helper without exposing payloads or secrets", () => {
    expect(source).toContain(
      "create or replace function public.warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1()",
    );
    expect(source).toContain("'public_wrapper_preserved'");
    expect(source).toContain("'source_preserves_stock_truth_path'");
    expect(source).toContain("'source_preserves_meta_shape'");
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1() to authenticated",
    );
    expect(lowerSource).not.toContain("service_role");
    expect(lowerSource).not.toContain("raw payload");
    expect(lowerSource).not.toContain("staging_supabase");
  });

  it("keeps the patch migration-ready and records explain access status", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);

    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(matrix.wave).toBe("S-LOAD-FIX-6");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect((matrix.stagingExplain as Record<string, unknown>).available).toBe(false);
    expect((matrix.execution as Record<string, unknown>).productionTouched).toBe(false);
    expect((matrix.execution as Record<string, unknown>).stagingDdlMigrationApplied).toBe(false);
    expect(proof).toContain("GREEN_SOURCE_PATCH_READY");
    expect(proof).toContain("PGRST107");
    expect(proof).toContain("S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-3");
  });
});
