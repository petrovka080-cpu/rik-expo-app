import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, "").replace(/\\/g, "/"));

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  file === "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql";

describe("S-PAG-7 hotspot list read pagination", () => {
  it("bounds contractor and buyer child-list reads without clipping default callers", () => {
    const contractorData = read("src/screens/contractor/contractor.data.ts");
    expect(contractorData).toContain("CONTRACTOR_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(contractorData).toContain("async function loadPagedContractorRows");
    expect(contractorData).toContain("normalizePage({ page: pageIndex }, CONTRACTOR_LIST_PAGE_DEFAULTS)");
    expect(contractorData).toContain(".range(page.from, page.to)");
    expect(contractorData).toContain('.from("requests")');
    expect(contractorData).toContain('.from("work_progress_log")');
    expect(contractorData).toContain('.from("work_progress_log_materials")');
    expect(contractorData).toContain('.from("v_wh_issue_req_items_ui")');

    const buyerRepo = read("src/screens/buyer/buyer.repo.ts");
    expect(buyerRepo).toContain("BUYER_REPO_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(buyerRepo).toContain("async function loadPagedBuyerRepoRows");
    expect(buyerRepo).toContain("normalizePage(pageInput, BUYER_REPO_LIST_PAGE_DEFAULTS)");
    expect(buyerRepo).toContain("normalizePage({ page: pageIndex }, BUYER_REPO_LIST_PAGE_DEFAULTS)");
    expect(buyerRepo).toContain("repoGetProposalItemsForView(");
    expect(buyerRepo).toContain("repoGetProposalItemLinks(");
    expect(buyerRepo).toContain("repoGetRequestItemToRequestMap(");
    expect(buyerRepo.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("clamps the two S-LOAD-3 hotspot list rpc callers", () => {
    const buyerFetchers = read("src/screens/buyer/buyer.fetchers.ts");
    expect(buyerFetchers).toContain("BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100");
    expect(buyerFetchers).toContain("normalizeBuyerInboxLimit");
    expect(buyerFetchers).toContain("p_limit: normalizedLimitGroups");
    expect(buyerFetchers).toContain('runContainedRpc(supabase, "buyer_summary_inbox_scope_v1"');

    const warehouseCanonical = read("src/screens/warehouse/warehouse.requests.read.canonical.ts");
    expect(warehouseCanonical).toContain("WAREHOUSE_ISSUE_QUEUE_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 }");
    expect(warehouseCanonical).toContain("normalizeWarehouseIssueQueuePage");
    expect(warehouseCanonical).toContain("p_limit: normalizedPage.pageSize");
    expect(warehouseCanonical).toContain('supabase.rpc("warehouse_issue_queue_scope_v4"');
  });

  it("keeps skipped surfaces and hard exclusions untouched", () => {
    const contractorResolvers = read("src/screens/contractor/contractor.resolvers.ts");
    expect(contractorResolvers).toContain(".maybeSingle()");
    expect(contractorResolvers).not.toContain("loadPagedContractorRows");
    expect(contractorResolvers).not.toContain("normalizePage(");

    const forbiddenChanged = changedFiles().filter((file) =>
      !isLaterApprovedWarehouseIssueSourcePatch(file) &&
      (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|android\/|ios\/|supabase\/migrations\/|maestro\/)/.test(file) ||
        /(?:pdf|report|export|integrity\.guards|warehouse\.api\.repo|storage)/i.test(file)),
    );
    expect(forbiddenChanged).toEqual([]);
  });

  it("records the hotspot proof artifact with baseline, post count, and safety flags", () => {
    const matrix = JSON.parse(read("artifacts/S_PAG_7_hotspot_list_pagination_matrix.json"));
    expect(matrix.wave).toBe("S-PAG-7");
    expect(matrix.baseline).toMatchObject({
      unboundedSelects: 95,
      unboundedFiles: 37,
    });
    expect(matrix.result).toMatchObject({
      unboundedSelects: 86,
      unboundedFiles: 37,
      fixedCallSites: 10,
      targetMet: true,
    });
    expect(matrix.skippedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/screens/contractor/contractor.resolvers.ts",
          reason: expect.stringContaining("single-row"),
        }),
      ]),
    );
    expect(matrix.safety).toMatchObject({
      productionTouched: false,
      stagingTouched: false,
      writes: false,
      sqlRpcRlsStorageChanged: false,
      businessLogicChanged: false,
      otaEasPlayMarketTouched: false,
    });
  });
});
