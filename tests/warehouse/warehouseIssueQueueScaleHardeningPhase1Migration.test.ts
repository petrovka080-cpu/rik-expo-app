import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260422170000_r4_a_warehouse_issue_queue_fallback_scope_pushdown.sql",
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

describe("R4.A warehouse issue queue fallback scope pushdown migration", () => {
  it("updates only the exact warehouse issue queue scope rpc", () => {
    expect(source).toContain("create or replace function public.warehouse_issue_queue_scope_v4(");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_issue_items_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_incoming_queue_scope_v1");
    expect(lowerSource).not.toContain("create or replace function public.warehouse_stock_scope_v2");
    expect(lowerSource).not.toContain("buyer_summary_inbox_scope_v1");
  });

  it("scopes expensive fallback truth work through exact request subsets", () => {
    const publicScope = extractFunction("warehouse_issue_queue_scope_v4(");

    expect(publicScope).toContain("missing_ui_truth_requests_all as");
    expect(publicScope).toContain("fallback_items_active_all as");
    expect(publicScope).toContain("fallback_truth_request_ids as");
    expect(publicScope).toContain("join fallback_truth_request_ids fr");
    expect(publicScope).toContain("fallback_active_request_count as");
    expect(publicScope).toContain("fallback_code_keys as");
    expect(publicScope).toContain("join head_view hv");
    expect(publicScope).toContain("na.offset_value = 0");
  });

  it("keeps stock aggregation limited to fallback codes and preserves the v4 payload contract", () => {
    const publicScope = extractFunction("warehouse_issue_queue_scope_v4(");

    expect(publicScope).toContain("from public.v_warehouse_stock vs");
    expect(publicScope).toContain("from fallback_code_keys fck");
    expect(publicScope).toContain("'document_type', 'warehouse_issue_queue_scope'");
    expect(publicScope).toContain("'version', 'v4'");
    expect(publicScope).toContain("'payload_shape_version', 'v4'");
    expect(publicScope).toContain("'rows_source', 'warehouse_issue_queue_scope_v4'");
    expect(publicScope).toContain("'id', pr.request_id");
    expect(publicScope).toContain("'generated_at', timezone('utc', now())");
    expect(publicScope).toContain("'fallback_truth_request_count'");
  });

  it("runs cpu proof plus multi-window parity checks during migration apply", () => {
    expect(source).toContain("select public.warehouse_issue_queue_r3c_cpu_proof_v1()");
    expect(source).toContain("select public.warehouse_issue_queue_r3c_parity_v1(0, 25)");
    expect(source).toContain("select public.warehouse_issue_queue_r3c_parity_v1(0, 50)");
    expect(source).toContain("select public.warehouse_issue_queue_r3c_parity_v1(0, 100)");
    expect(source).toContain("select public.warehouse_issue_queue_r3c_parity_v1(300, 100)");
    expect(source).toContain("R4.A warehouse issue queue parity drift");
  });

  it("stays inside one narrow migration wave with grant and schema reload intact", () => {
    expect(source).toContain(
      "grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(lowerSource).not.toContain("react");
    expect(lowerSource).not.toContain("pdf");
    expect(lowerSource).not.toContain("director_finance");
    expect(lowerSource).not.toContain("warehouse_issue_post");
  });
});
