import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-PAG-4 remaining top list pagination contract", () => {
  it("keeps S-PAG-3A and S-PAG-3B call-sites paginated", () => {
    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain(".range(page.from, page.to)");
    expect(proposals).toContain(".order(\"submitted_at\", { ascending: false })");
    expect(proposals).toContain(".order(\"id\", { ascending: false })");

    const buyerBuckets = read("src/screens/buyer/buyer.buckets.repo.ts");
    expect(buyerBuckets.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);

    const buyerCounterparty = read("src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts");
    expect(buyerCounterparty.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0).toBe(5);
    expect(buyerCounterparty).not.toContain(".limit(3000)");
    expect(buyerCounterparty).not.toContain(".limit(2000)");

    const notifications = read("src/lib/api/notifications.ts");
    expect(notifications).toContain(".eq(\"role\", role)");
    expect(notifications).toContain(".order(\"created_at\", { ascending: false })");
    expect(notifications).toContain(".order(\"id\", { ascending: false })");
    expect(notifications).toContain(".range(page.from, page.to)");
  });

  it("paginates supplier showcase list windows with stable ordering and preserved filters", () => {
    const source = read("src/features/supplierShowcase/supplierShowcase.data.ts");
    expect(source).toContain("SUPPLIER_SHOWCASE_PAGE_DEFAULTS = { pageSize: 60, maxPageSize: 100 }");
    expect(source.match(/normalizePage\(pageInput, SUPPLIER_SHOWCASE_PAGE_DEFAULTS\)/g)).toHaveLength(2);
    expect(source).toContain(".eq(\"user_id\", userId)");
    expect(source).toContain(".eq(\"company_id\", companyId)");
    expect(source).toContain("query = query.eq(\"status\", \"active\")");
    expect(source.match(/\.order\(\"created_at\", \{ ascending: false \}\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source.match(/\.order\(\"id\", \{ ascending: false \}\)/g)).toHaveLength(2);
    expect(source.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(2);
    expect(source).not.toContain(".limit(60)");
  });

  it("paginates catalog and AI search windows with stable ordering and clamps", () => {
    const catalogModal = read("src/components/map/CatalogSearchModal.tsx");
    expect(catalogModal).toContain("CATALOG_SEARCH_PAGE_DEFAULTS = { pageSize: 60, maxPageSize: 100 }");
    expect(catalogModal).toContain("normalizePage(undefined, CATALOG_SEARCH_PAGE_DEFAULTS)");
    expect(catalogModal).toContain(".or(");
    expect(catalogModal).toContain("query = query.eq(\"kind\", kind)");
    expect(catalogModal).toContain(".order(\"rik_code\", { ascending: true })");
    expect(catalogModal).toContain(".order(\"id\", { ascending: true })");
    expect(catalogModal).toContain(".range(page.from, page.to)");
    expect(catalogModal).not.toContain(".limit(60)");

    const assistant = read("src/features/ai/assistantActions.ts");
    expect(assistant).toContain("ASSISTANT_MARKET_SEARCH_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(assistant).toContain("normalizePage(undefined, ASSISTANT_MARKET_SEARCH_PAGE_DEFAULTS)");
    expect(assistant).toContain(".eq(\"status\", \"active\")");
    expect(assistant).toContain(".order(\"created_at\", { ascending: false })");
    expect(assistant).toContain(".order(\"id\", { ascending: false })");
    expect(assistant).toContain(".range(page.from, page.to)");
    expect(assistant).not.toContain(".limit(120)");
  });

  it("paginates chat and catalog fallback windows without changing filters or return shape", () => {
    const chat = read("src/lib/chat_api.ts");
    expect(chat).toContain("normalizePage({ pageSize: limit }, { pageSize: 100, maxPageSize: 100 })");
    expect(chat).toContain(".eq(\"supplier_id\", listingId)");
    expect(chat).toContain(".eq(\"is_deleted\", false)");
    expect(chat).toContain(".order(\"created_at\", { ascending: true })");
    expect(chat).toContain(".order(\"id\", { ascending: true })");
    expect(chat).toContain(".range(page.from, page.to)");
    expect(chat).not.toContain(".limit(limit)");

    const catalogTransport = read("src/lib/catalog/catalog.transport.ts");
    expect(catalogTransport).toContain("CATALOG_FALLBACK_PAGE_DEFAULTS = { pageSize: 50, maxPageSize: 100 }");
    expect(catalogTransport.match(/normalizePage\(\{ pageSize: limit \}, CATALOG_FALLBACK_PAGE_DEFAULTS\)/g)).toHaveLength(2);
    expect(catalogTransport).toContain("name_human.ilike.%${token}%");
    expect(catalogTransport).toContain("rik_code.ilike.%${token}%");
    expect(catalogTransport.match(/\.order\(\"rik_code\", \{ ascending: true \}\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(catalogTransport.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(2);
  });

  it("does not cap PDF, report, export, or detail full reads", () => {
    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    expect(pdfProposal).not.toContain(".range(");
    expect(pdfProposal).not.toContain("normalizePage(");

    const requestPdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    expect(requestPdfBuilder).not.toContain(".range(");
    expect(requestPdfBuilder).not.toContain("normalizePage(");

    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    expect(warehouseRepo).not.toContain("normalizePage(");

    const proposalItemsDetail = read("src/lib/api/proposals.ts");
    expect(proposalItemsDetail).toContain("export async function proposalItems");
    const proposalItemsBody = proposalItemsDetail.slice(proposalItemsDetail.indexOf("export async function proposalItems"));
    expect(proposalItemsBody).not.toContain("normalizePage(");
  });
});
