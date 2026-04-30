import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260430103000_s_load_fix_4_warehouse_issue_queue_latency_patch.sql",
);

const matrixPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_4_warehouse_issue_queue_latency_patch_matrix.json",
);

const proofPath = path.join(
  process.cwd(),
  "artifacts/S_LOAD_FIX_4_warehouse_issue_queue_latency_patch_proof.md",
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

describe("S-LOAD-FIX-4 warehouse issue queue latency patch", () => {
  it("preserves the public warehouse issue queue RPC signature and keeps the prior source body private", () => {
    expect(source).toContain(
      "alter function public.warehouse_issue_queue_scope_v4(integer, integer)",
    );
    expect(source).toContain("rename to warehouse_issue_queue_scope_v4_source_before_sloadfix4");
    expect(source).toContain("create or replace function public.warehouse_issue_queue_scope_v4(");
    expect(source).toContain("p_offset integer default 0");
    expect(source).toContain("p_limit integer default 50");
    expect(source).toContain(
      "revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated",
    );
  });

  it("normalizes direct RPC pagination and caps final rows without changing source order", () => {
    const publicScope = extractFunction("warehouse_issue_queue_scope_v4(");

    expect(publicScope).toContain("greatest(0, coalesce(p_offset, 0))");
    expect(publicScope).toContain("least(100, greatest(1, coalesce(p_limit, 50)))");
    expect(publicScope).toContain(
      "public.warehouse_issue_queue_scope_v4_source_before_sloadfix4",
    );
    expect(publicScope).toContain("jsonb_array_elements(coalesce(sp.payload -> 'rows', '[]'::jsonb))");
    expect(publicScope).toContain("with ordinality as src(row_value, ordinality)");
    expect(publicScope).toContain("src.ordinality <= na.limit_value");
    expect(publicScope).toContain("jsonb_agg(src.row_value order by src.ordinality)");
    expect(publicScope).toContain("jsonb_set(sp.payload, '{rows}', br.rows, true)");
    expect(publicScope).toContain("'{meta,row_count}'");
  });

  it("adds only the targeted fallback item text-join index for the measured issue queue hotspot", () => {
    expect(source).toContain("create index if not exists idx_request_items_issue_queue_request_text_sloadfix4");
    expect(source).toContain("on public.request_items ((request_id::text), (id::text))");
    expect(source).toContain("include (rik_code, uom, status, name_human, qty)");
    expect(source).toContain("compare request_items request_id/id through ::text expressions");

    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.buyer_summary_buckets_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.buyer_summary_inbox_scope_v1");
    expect(lowerSource).not.toContain("warehouse_issue_post");
  });

  it("adds a migration-time proof helper without exposing payloads or secrets", () => {
    const proofFunction = extractFunction("warehouse_issue_queue_sloadfix4_source_patch_proof_v1()");

    expect(proofFunction).toContain("'public_signature_preserved'");
    expect(proofFunction).toContain("'source_before_wrapper_exists'");
    expect(proofFunction).toContain("'public_clamps_limit_to_100'");
    expect(proofFunction).toContain("'public_caps_rows_by_ordinality'");
    expect(proofFunction).toContain("'request_items_text_join_index_exists'");
    expect(proofFunction).not.toContain("staging_supabase");
    expect(proofFunction).not.toContain("service_role");
    expect(proofFunction).not.toContain("raw payload");
  });

  it("keeps the patch repo-only, migration-ready, and narrow", () => {
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(lowerSource).not.toContain("staging_load_enabled");
    expect(lowerSource).not.toContain("supabase_service_role_key");
    expect(lowerSource).not.toMatch(/\beas\b/);
    expect(lowerSource).not.toMatch(/\bota\b/);
    expect(lowerSource).not.toContain("play market");
  });

  it("produces S-LOAD-FIX-4 proof artifacts with source-patch-ready status", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);

    expect(matrix.wave).toBe("S-LOAD-FIX-4");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect((matrix.execution as Record<string, unknown>).stagingLoadRun).toBe(false);
    expect((matrix.safety as Record<string, unknown>).productionTouched).toBe(false);
    expect((matrix.safety as Record<string, unknown>).stagingTouched).toBe(false);
    expect(proof).toContain("GREEN_SOURCE_PATCH_READY");
    expect(proof).toContain("S-LOAD-7 is required");
  });
});
