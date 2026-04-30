import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  file.replace(/\\/g, "/") === sLoadFix6WarehouseIssueExplainPatch;

describe("S-PAG-8 remaining safe list pagination", () => {
  it("bounds six safe remaining list and enrichment reads", () => {
    const auctions = read("src/features/auctions/auctions.data.ts");
    expect(auctions).toContain("AUCTION_CHILD_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(auctions).toContain("async function loadPagedAuctionRows");
    expect(auctions).toContain("normalizePage({ page: pageIndex }, AUCTION_CHILD_LIST_PAGE_DEFAULTS)");
    expect(auctions).toContain(".from(\"tender_items\")");
    expect(auctions).toContain(".order(\"tender_id\", { ascending: true })");
    expect(auctions).toContain(".order(\"created_at\", { ascending: true })");
    expect(auctions).toContain(".order(\"id\", { ascending: true })");
    expect(auctions).toContain("queryFactory().range(page.from, page.to)");

    const proposalNos = read("src/screens/buyer/hooks/useBuyerProposalNos.ts");
    expect(proposalNos).toContain("BUYER_PROPOSAL_NOS_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(proposalNos).toContain("normalizePage({ page: pageIndex }, BUYER_PROPOSAL_NOS_PAGE_DEFAULTS)");
    expect(proposalNos).toContain(".order(\"id\", { ascending: true })");
    expect(proposalNos).toContain(".range(page.from, page.to)");

    const buyerBuckets = read("src/screens/buyer/buyer.buckets.repo.ts");
    expect(buyerBuckets).toContain("fetchBuyerProposalItemIds");
    expect(buyerBuckets).toContain("normalizePage({ page: pageIndex }, { pageSize: 100, maxPageSize: 100 })");
    expect(buyerBuckets).toContain(".order(\"proposal_id\", { ascending: true })");
    expect(buyerBuckets).toContain(".order(\"request_item_id\", { ascending: true })");
    expect(buyerBuckets).toContain(".range(page.from, page.to)");

    const chatApi = read("src/lib/chat_api.ts");
    expect(chatApi).toContain("const profilePage = normalizePage(");
    expect(chatApi).toContain(".order(\"user_id\", { ascending: true })");
    expect(chatApi).toContain(".range(profilePage.from, profilePage.to)");

    const officeAccess = read("src/screens/office/officeAccess.services.ts");
    expect(officeAccess).toContain("const profilePage = normalizePage(");
    expect(officeAccess).toContain(".order(\"user_id\", { ascending: true })");
    expect(officeAccess).toContain(".range(profilePage.from, profilePage.to)");

    const warehouseNameMap = read("src/screens/warehouse/warehouse.nameMap.ui.ts");
    expect(warehouseNameMap).toContain("WAREHOUSE_NAME_MAP_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(warehouseNameMap).toContain("normalizePage({ page: pageIndex }, WAREHOUSE_NAME_MAP_PAGE_DEFAULTS)");
    expect(warehouseNameMap).toContain(".order(\"code\", { ascending: true })");
    expect(warehouseNameMap).toContain(".range(page.from, page.to)");
  });

  it("keeps detail, report, guard, storage, SQL, native, and package surfaces untouched", () => {
    const auctions = read("src/features/auctions/auctions.data.ts");
    const detailStart = auctions.indexOf("export async function loadAuctionDetail");
    const detailEnd = auctions.indexOf("export function buildAuctionAssistantPrompt");
    expect(auctions.slice(detailStart, detailEnd)).not.toContain("loadPagedAuctionRows");

    const forbiddenChanged = changedFiles().filter((file) =>
      !isApprovedSLoadFix6WarehouseIssuePatch(file) &&
      (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|android\/|ios\/|supabase\/migrations\/|maestro\/)/.test(file) ||
        /(?:pdf|report|export|integrity\.guards|storage)/i.test(file)),
    );
    expect(forbiddenChanged).toEqual([]);
  });

  it("records the S-PAG-8 proof artifact with counts and safety flags", () => {
    const matrix = JSON.parse(read("artifacts/S_PAG_8_remaining_safe_list_pagination_matrix.json"));
    expect(matrix.wave).toBe("S-PAG-8");
    expect(matrix.baseline).toMatchObject({
      unboundedSelects: 86,
      unboundedFiles: 37,
    });
    expect(matrix.result).toMatchObject({
      unboundedSelects: 80,
      unboundedFiles: 37,
      fixedCallSites: 6,
      targetMet: true,
    });
    expect(matrix.safety).toMatchObject({
      productionTouched: false,
      stagingTouched: false,
      writes: false,
      sqlRpcRlsStorageChanged: false,
      packageNativeChanged: false,
      businessLogicChanged: false,
      otaEasPlayMarketTouched: false,
      secretsPrintedOrCommitted: false,
    });
  });
});
