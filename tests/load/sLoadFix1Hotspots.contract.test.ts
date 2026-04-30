import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(__dirname, "../..");

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const readJson = (relativePath: string) =>
  JSON.parse(readSource(relativePath)) as Record<string, unknown>;

const dirtyPaths = () => {
  const output = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
};

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "src/screens/warehouse/warehouse.stockReports.service.ts",
  ].includes(file.replace(/\\/g, "/"));

describe("S-LOAD-FIX-1 hotspot contract", () => {
  it("keeps the S-LOAD-3 staging evidence valid and focused on optimize_next targets", () => {
    const live = readJson("artifacts/S_LOAD_3_live_staging_load_matrix.json");
    const legacy = readJson("artifacts/S_LOAD_1_staging_load_test_matrix.json");

    expect(live.status).toBe("GREEN_STAGING_EXECUTED");
    expect(legacy.liveRun).toBe("completed");
    expect((live.execution as Record<string, unknown>).targetsCollected).toBe(5);
    expect(Array.isArray(legacy.targets)).toBe(true);

    const targets = live.targets as Array<Record<string, unknown>>;
    const recommendations = Object.fromEntries(
      targets.map((target) => [target.id, target.recommendation]),
    );
    expect(recommendations).toMatchObject({
      warehouse_issue_queue_page_25: "optimize_next",
      buyer_summary_inbox_page_25: "optimize_next",
      warehouse_stock_page_60: "watch",
    });
  });

  it("keeps warehouse_issue_queue_page_25 bounded and validated without SQL/RPC changes", () => {
    const source = readSource("src/screens/warehouse/warehouse.requests.read.canonical.ts");

    expect(source).toContain('supabase.rpc("warehouse_issue_queue_scope_v4"');
    expect(source).toContain("p_offset: offset");
    expect(source).toContain("p_limit: normalizedPage.pageSize");
    expect(source).toContain("WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 }");
    expect(source).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(source).toMatch(
      /requireBoundedRpcRows\(\s*validated,\s*"warehouse_issue_queue_scope_v4",\s*normalizedPage\.pageSize,\s*\)/,
    );
    expect(source).toContain("rows length exceeds p_limit");
  });

  it("keeps buyer_summary_inbox_page_25 bounded and validates the RPC envelope", () => {
    const fetcherSource = readSource("src/screens/buyer/buyer.fetchers.ts");
    const serviceSource = readSource("src/screens/buyer/buyer.summary.service.ts");

    expect(fetcherSource).toContain('runContainedRpc(supabase, "buyer_summary_inbox_scope_v1"');
    expect(fetcherSource).toContain("BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100");
    expect(fetcherSource).toContain("p_offset: normalizedOffsetGroups");
    expect(fetcherSource).toContain("p_limit: normalizedLimitGroups");
    expect(fetcherSource).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(fetcherSource).toContain('rpcName: "buyer_summary_inbox_scope_v1"');
    expect(serviceSource).toContain("mapWithConcurrencyLimit(");
    expect(serviceSource).toContain("scopes,\n      2,");
  });

  it("keeps the wave inside allowed code and artifact boundaries", () => {
    const changed = dirtyPaths();
    const forbidden = changed.filter((file) =>
      !isLaterApprovedWarehouseIssueSourcePatch(file) &&
      (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|ios\/|android\/|supabase\/migrations\/|maestro\/|node_modules\/|android\/app\/build\/)/.test(
          file.replace(/\\/g, "/"),
        ) ||
        /\.(?:apk|aab)$/i.test(file) ||
        /(?:pdf|report|export|detail)/i.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
