import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
);

const matrixPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_6_warehouse_issue_queue_explain_index_patch_matrix.json",
);

const proofPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_6_warehouse_issue_queue_explain_index_patch_proof.md",
);

const readSource = (filePath: string) => fs.readFileSync(filePath, "utf8");

const source = readSource(migrationPath);
const lowerSource = source.toLowerCase();

describe("S-LOAD-FIX-6 warehouse issue queue explain index patch", () => {
  it("replaces the unsupported index draft with an EXPLAIN-backed source materialization patch", () => {
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)",
    );
    expect(source).toContain("pg_get_functiondef(");
    expect(source).toContain("execute v_next");
    expect(source).toContain("fallback_truth_by_req as materialized (");
    expect(source).toContain("merged_truth as materialized (");
    expect(source).not.toContain("idx_requests_issue_queue_coalesced_order_sloadfix6");
    expect(source).not.toContain("idx_requests_issue_queue_id_text_sloadfix6");
  });

  it("does not change the public wrapper, exact count semantics, or Fix-5 restore boundary", () => {
    expect(source).not.toContain("alter function public.warehouse_issue_queue_scope_v4(integer, integer)");
    expect(source).not.toContain("create or replace function public.warehouse_issue_queue_scope_v4(");
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

  it("records real sanitized EXPLAIN evidence and candidate parity", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);
    const explain = matrix.sanitizedExplain as Record<string, unknown>;
    const candidate = matrix.selectedPatchEvidence as Record<string, unknown>;
    const rejected = matrix.rejectedPatch as Record<string, unknown>;

    expect(matrix.wave).toBe("S-LOAD-FIX-6");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect(matrix.evidenceStatus).toBe("REAL_EXPLAIN_ANALYZE_CAPTURED");
    expect((explain.sourceBodyExplainAnalyze as Record<string, unknown>).available).toBe(true);
    expect((explain.sourceBodyExplainAnalyze as Record<string, unknown>).nodeCount).toBe(197);
    expect(candidate.baselineExecutionMs).toBeGreaterThan(2500);
    expect(candidate.selectedVariantExecutionMs).toBeLessThan(900);
    expect(candidate.rowsWithinLimit).toBe(true);
    expect(candidate.rowHashEqual).toBe(true);
    expect(candidate.metaHashEqual).toBe(true);
    expect(rejected.migration).toContain("20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql");
    expect(rejected.reason).toContain("requests Seq Scan");
    expect(proof).toContain("REAL_EXPLAIN_ANALYZE_CAPTURED");
    expect(proof).toContain("2606ms");
    expect(proof).toContain("826ms");
  });

  it("keeps safety claims explicit and avoids secrets or raw payloads", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const safety = matrix.safety as Record<string, unknown>;

    expect(safety.productionTouched).toBe(false);
    expect(safety.serviceRoleUsed).toBe(false);
    expect(safety.stagingMigrationApplied).toBe(false);
    expect(safety.stagingLoadRun).toBe(false);
    expect(safety.dataWrites).toBe(false);
    expect(safety.packageNativeConfigChanged).toBe(false);
    expect(safety.businessLogicChanged).toBe(false);
    expect(safety.warehouseStockMathChanged).toBe(false);
    expect(safety.otaEasPlayMarketTouched).toBe(false);
    expect(safety.secretsPrinted).toBe(false);
    expect(safety.secretsCommitted).toBe(false);
    expect(lowerSource).not.toContain("service_role");
    expect(lowerSource).not.toContain("staging_supabase");
  });
});
