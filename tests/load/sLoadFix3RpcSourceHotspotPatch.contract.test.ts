import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260430093000_s_load_fix_3_rpc_source_hotspot_patch.sql",
);

const matrixPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_3_rpc_source_hotspot_patch_matrix.json",
);

const proofPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_3_rpc_source_hotspot_patch_proof.md",
);

const readSource = (filePath: string) => fs.readFileSync(filePath, "utf8");

const source = readSource(migrationPath);
const lowerSource = source.toLowerCase();

const extractFunction = (functionName: string): string => {
  const signature = `create or replace function public.${functionName}`;
  const start = lowerSource.indexOf(signature.toLowerCase());
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lowerSource.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return lowerSource.slice(start, end);
};

describe("S-LOAD-FIX-3 RPC source hotspot patch", () => {
  it("preserves the public buyer inbox RPC signature and keeps the prior source body private", () => {
    expect(source).toContain(
      "alter function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)",
    );
    expect(source).toContain("rename to buyer_summary_inbox_scope_v1_source_before_sloadfix3");
    expect(source).toContain("create or replace function public.buyer_summary_inbox_scope_v1(");
    expect(source).toContain("p_offset integer default 0");
    expect(source).toContain("p_limit integer default 12");
    expect(source).toContain("p_search text default null");
    expect(source).toContain("p_company_id uuid default null");
    expect(source).toContain(
      "revoke all on function public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid) from authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated",
    );
  });

  it("enforces buyer_summary_inbox_scope_v1 output rows <= normalized p_limit at the RPC source", () => {
    const publicScope = extractFunction("buyer_summary_inbox_scope_v1(");

    expect(publicScope).toContain("least(100, greatest(1, coalesce(p_limit, 12)))");
    expect(publicScope).toContain("greatest(0, coalesce(p_offset, 0))");
    expect(publicScope).toContain(
      "public.buyer_summary_inbox_scope_v1_source_before_sloadfix3",
    );
    expect(publicScope).toContain("jsonb_array_elements(coalesce(sp.payload -> 'rows', '[]'::jsonb))");
    expect(publicScope).toContain("with ordinality as src(row_value, ordinality)");
    expect(publicScope).toContain("src.ordinality <= na.limit_groups");
    expect(publicScope).toContain("jsonb_agg(kept.row_value order by kept.ordinality)");
    expect(publicScope).toContain("jsonb_set(sp.payload, '{rows}', br.rows, true)");
    expect(publicScope).toContain("'{meta,returned_row_count}'");
  });

  it("documents clamp behavior for null, zero, negative, and oversized limits without changing ordering", () => {
    const publicScope = extractFunction("buyer_summary_inbox_scope_v1(");

    expect(publicScope).toContain("coalesce(p_limit, 12)");
    expect(publicScope).toContain("greatest(1, coalesce(p_limit, 12))");
    expect(publicScope).toContain("least(100, greatest(1, coalesce(p_limit, 12)))");
    expect(publicScope).toContain("with ordinality as src(row_value, ordinality)");
    expect(publicScope).toContain("jsonb_agg(kept.row_value order by kept.ordinality)");
  });

  it("adds a migration-time proof helper without exposing raw payloads or secrets", () => {
    const proofFunction = extractFunction("buyer_summary_inbox_sloadfix3_bound_proof_v1()");

    expect(proofFunction).toContain("'public_signature_preserved'");
    expect(proofFunction).toContain("'source_before_wrapper_exists'");
    expect(proofFunction).toContain("'public_caps_rows_by_ordinality'");
    expect(proofFunction).toContain("'public_preserves_row_order'");
    expect(proofFunction).toContain("'public_rewrites_returned_row_count'");
    expect(proofFunction).not.toContain("staging_supabase");
    expect(proofFunction).not.toContain("service_role");
    expect(proofFunction).not.toContain("raw payload");
  });

  it("adds warehouse issue queue index-shape optimization without rewriting warehouse stock math", () => {
    expect(source).toContain("create index if not exists idx_warehouse_issue_queue_context_order_sloadfix3");
    expect(source).toContain("on public.warehouse_issue_queue_context_v1");
    expect(source).toContain("source_submitted_at desc nulls last");
    expect(source).toContain("display_year desc");
    expect(source).toContain("display_seq desc");
    expect(source).toContain("request_id desc");
    expect(source).toContain("create index if not exists idx_request_items_issue_queue_fallback_sloadfix3");
    expect(source).toContain("on public.request_items (request_id, id)");
    expect(source).toContain("include (rik_code, uom, status, name_human, qty)");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_issue_post");
  });

  it("keeps the patch repo-only and migration-ready", () => {
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(lowerSource).not.toContain("staging_load_enabled");
    expect(lowerSource).not.toContain("production");
    expect(lowerSource).not.toContain("supabase_service_role_key");
    expect(lowerSource).not.toMatch(/\beas\b/);
    expect(lowerSource).not.toMatch(/\bota\b/);
    expect(lowerSource).not.toContain("play market");
  });

  it("produces S-LOAD-FIX-3 proof artifacts with source-patch-ready status", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);

    expect(matrix.wave).toBe("S-LOAD-FIX-3");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect((matrix.execution as Record<string, unknown>).stagingLoadRun).toBe(false);
    expect((matrix.safety as Record<string, unknown>).productionTouched).toBe(false);
    expect((matrix.safety as Record<string, unknown>).stagingTouched).toBe(false);
    expect(proof).toContain("GREEN_SOURCE_PATCH_READY");
    expect(proof).toContain("S-LOAD-6 is required");
  });
});
