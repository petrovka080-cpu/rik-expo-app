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
  it("adds only migration-ready request indexes for the warehouse issue queue hot path", () => {
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
    expect(source).toContain("create index if not exists idx_requests_issue_queue_coalesced_order_sloadfix6");
    expect(source).toContain("create index if not exists idx_requests_issue_queue_id_text_sloadfix6");
    expect(source).toContain("(coalesce(submitted_at, created_at)) desc nulls last");
    expect(source).toContain("(id::text) desc");
    expect(source).toContain("on public.requests ((id::text))");
  });

  it("does not change RPC source, business semantics, or warehouse stock math", () => {
    expect(lowerSource).not.toContain("create or replace function public.warehouse_issue_queue_scope_v4");
    expect(lowerSource).not.toContain("warehouse_issue_queue_scope_v4_source_before_sloadfix4");
    expect(lowerSource).not.toContain("execute v_next");
    expect(lowerSource).not.toContain("from public.v_warehouse_stock");
    expect(lowerSource).not.toContain("stock_by_code");
    expect(lowerSource).not.toContain("warehouse_stock_scope");
    expect(lowerSource).not.toContain("sorted_probe_rows");
    expect(lowerSource).not.toContain("total_kind");
    expect(lowerSource).not.toContain("total_exact");
  });

  it("documents why Fix-5 is not reintroduced and why live explain was blocked", () => {
    const matrix = JSON.parse(readSource(matrixPath)) as Record<string, unknown>;
    const proof = readSource(proofPath);
    const diagnosis = matrix.diagnosis as Record<string, unknown>;
    const connectivity = matrix.stagingConnectivity as Record<string, unknown>;
    const explain = matrix.sanitizedExplain as Record<string, unknown>;

    expect(matrix.wave).toBe("S-LOAD-FIX-6");
    expect(matrix.status).toBe("GREEN_SOURCE_PATCH_READY");
    expect(matrix.evidenceStatus).toBe("PARTIAL_EXPLAIN_DNS_BLOCKED");
    expect(connectivity.stagingDbUrlParseOk).toBe(true);
    expect(connectivity.stagingDbUrlDnsResolvable).toBe(false);
    expect(connectivity.dnsErrorCode).toBe("ENOTFOUND");
    expect(explain.attempted).toBe(true);
    expect(explain.available).toBe(false);
    expect(explain.rawPlanPrinted).toBe(false);
    expect(diagnosis.planDrivenLiveBottleneckConfirmed).toBe(false);
    expect(proof).toContain("Fix-5/Fix-5b/Fix-5c lower-bound/probe rewrites must not be repeated");
    expect(proof).toContain("No raw rows, raw plan, env values, or secrets were printed.");
  });

  it("keeps safety claims explicit", () => {
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
  });
});
