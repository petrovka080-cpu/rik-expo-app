import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260430114500_s_load_fix_5_warehouse_issue_queue_total_count_reduction.sql",
);

const matrixPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_5_warehouse_issue_queue_total_count_reduction_matrix.json",
);

const proofPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_5_warehouse_issue_queue_total_count_reduction_proof.md",
);

const readSource = (filePath: string) => fs.readFileSync(filePath, "utf8");

const source = readSource(migrationPath);
const lowerSource = source.toLowerCase();
const probeMaterializationSource = readSource(
  path.join(
    process.cwd(),
    "supabase/migrations/20260430120500_s_load_fix_5b_warehouse_issue_queue_probe_materialization.sql",
  ),
);
const lowerProbeMaterializationSource = probeMaterializationSource.toLowerCase();
const inlineProbeOrderSource = readSource(
  path.join(
    process.cwd(),
    "supabase/migrations/20260430122500_s_load_fix_5c_warehouse_issue_queue_inline_probe_order.sql",
  ),
);
const lowerInlineProbeOrderSource = inlineProbeOrderSource.toLowerCase();
const restoreExactCountSource = readSource(
  path.join(
    process.cwd(),
    "supabase/migrations/20260430124500_s_load_fix_5d_warehouse_issue_queue_restore_exact_count.sql",
  ),
);
const lowerRestoreExactCountSource = restoreExactCountSource.toLowerCase();

describe("S-LOAD-FIX-5 warehouse issue queue total-count reduction", () => {
  it("patches only the private warehouse issue queue source body behind the public wrapper", () => {
    expect(source).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(source).toContain("pg_get_functiondef(");
    expect(source).toContain("execute v_next");
    expect(source).not.toContain("alter function public.warehouse_issue_queue_scope_v4(integer, integer)");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.buyer_summary_buckets_scope_v1");
    expect(lowerSource).not.toContain("warehouse_issue_post");
  });

  it("replaces exact visible queue counting with a limit-plus-one pagination probe", () => {
    expect(source).toContain("(select count(*)::integer from visible_queue_rows) as total_count");
    expect(source).toContain("sorted_probe_rows as (");
    expect(source).toContain("limit ((select limit_value from normalized_args) + 1)");
    expect(source).toContain("(select count(*)::integer from sorted_probe_rows) as probe_row_count");
    expect(source).toContain("((select probe_row_count from window_stats) > (select limit_value from normalized_args)) as has_more");
    expect(source).toContain("'has_more', (select has_more from meta_stats)");
    expect(source).toContain("'total_exact', false");
    expect(source).toContain("'total_kind', 'lower_bound'");
  });

  it("keeps row payload, order, and page bound semantics unchanged", () => {
    expect(source).toContain("from sorted_probe_rows");
    expect(source).toContain("limit (select limit_value from normalized_args)");
    expect(source).toContain(
      "order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc",
    );
    expect(source).toContain("public_wrapper_preserved");
    expect(source).toContain("source_preserves_row_order");
    expect(source).toContain("source_preserves_page_bound");
  });

  it("removes the all-fallback diagnostic count and adds only a targeted base-column request index", () => {
    expect(source).toContain(
      "(select fallback_truth_request_count from fallback_active_request_count) as fallback_truth_request_count",
    );
    expect(source).toContain(
      "(select count(*)::integer from fallback_truth_by_req) as fallback_truth_request_count",
    );
    expect(source).toContain("create index if not exists idx_requests_issue_queue_submitted_created_sloadfix5");
    expect(source).not.toContain("(lower(trim(coalesce(status::text, ''))))");
    expect(source).not.toContain("(coalesce(submitted_at, created_at)) desc");
    expect(source).toContain("submitted_at desc nulls last");
    expect(source).toContain("created_at desc nulls last");
    expect(source).toContain("include (status, display_no, object_name, object_type_code, level_code, system_code, zone_code)");
  });

  it("adds a migration-time proof helper without exposing payloads or secrets", () => {
    expect(source).toContain(
      "create or replace function public.warehouse_issue_queue_sloadfix5_total_count_reduction_proof_v1()",
    );
    expect(source).toContain("'source_uses_limit_plus_one_probe'");
    expect(source).toContain("'source_reports_lower_bound_total'");
    expect(source).toContain("'request_submitted_created_index_exists'");
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_sloadfix5_total_count_reduction_proof_v1() to authenticated",
    );
    expect(lowerSource).not.toContain("staging_supabase");
    expect(lowerSource).not.toContain("service_role");
    expect(lowerSource).not.toContain("raw payload");
  });

  it("keeps the patch migration-ready and documents source-patch-ready status", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);

    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(matrix.wave).toBe("S-LOAD-FIX-5");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect((matrix.execution as Record<string, unknown>).stagingLoadRun).toBe(false);
    expect((matrix.safety as Record<string, unknown>).productionTouched).toBe(false);
    expect((matrix.safety as Record<string, unknown>).stagingTouched).toBe(false);
    expect(proof).toContain("GREEN_SOURCE_PATCH_READY");
    expect(proof).toContain("S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-2 is required");
  });

  it("adds a narrow materialization follow-up for the Fix-5 limit-plus-one probe", () => {
    expect(probeMaterializationSource).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(probeMaterializationSource).toContain("sorted_probe_rows as materialized (");
    expect(probeMaterializationSource).toContain("paged_rows as materialized (");
    expect(probeMaterializationSource).toContain(
      "create or replace function public.warehouse_issue_queue_sloadfix5b_probe_materialization_proof_v1()",
    );
    expect(probeMaterializationSource).toContain("'source_materializes_probe_rows'");
    expect(probeMaterializationSource).toContain("'source_materializes_paged_rows'");
    expect(lowerProbeMaterializationSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerProbeMaterializationSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerProbeMaterializationSource).not.toContain("warehouse_issue_post");
  });

  it("adds a narrow inline ordered probe follow-up without changing payload semantics", () => {
    expect(inlineProbeOrderSource).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(inlineProbeOrderSource).toContain("sorted_probe_rows as materialized (");
    expect(inlineProbeOrderSource).toContain("from visible_queue_rows");
    expect(inlineProbeOrderSource).toContain("order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc");
    expect(inlineProbeOrderSource).toContain("limit ((select limit_value from normalized_args) + 1)");
    expect(inlineProbeOrderSource).toContain("from sorted_rows");
    expect(inlineProbeOrderSource).toContain("position('from sorted_rows' in lower(v_next)) > 0");
    expect(inlineProbeOrderSource).toContain(
      "create or replace function public.warehouse_issue_queue_sloadfix5c_inline_probe_order_proof_v1()",
    );
    expect(inlineProbeOrderSource).toContain("'source_uses_inline_ordered_probe'");
    expect(lowerInlineProbeOrderSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerInlineProbeOrderSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerInlineProbeOrderSource).not.toContain("warehouse_issue_post");
  });

  it("adds a safety restore migration when the lower-bound probe cannot pass staging verification", () => {
    expect(restoreExactCountSource).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(restoreExactCountSource).toContain("(select count(*)::integer from visible_queue_rows) as total_count");
    expect(restoreExactCountSource).toContain("'source_restores_exact_visible_queue_total_count'");
    expect(restoreExactCountSource).toContain("'source_removes_lower_bound_total_metadata'");
    expect(restoreExactCountSource).toContain(
      "create or replace function public.warehouse_issue_queue_sloadfix5d_restore_exact_count_proof_v1()",
    );
    expect(lowerRestoreExactCountSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerRestoreExactCountSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerRestoreExactCountSource).not.toContain("warehouse_issue_post");
  });
});
