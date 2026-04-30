import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("S-PAG-3B top list pagination contract", () => {
  it("keeps S-PAG-3A call-sites paginated and unopened", () => {
    const buyerApi = read("src/lib/api/buyer.ts");
    const proposalsApi = read("src/lib/api/proposals.ts");
    const buyerBucketsRepo = read("src/screens/buyer/buyer.buckets.repo.ts");
    const contractorRepo = read("src/screens/contractor/contractor.loadWorksService.ts");

    expect(buyerApi).toContain("normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })");
    expect(proposalsApi).toContain("normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })");
    expect(buyerBucketsRepo.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(contractorRepo).toContain("normalizePage(undefined, { pageSize: 100, maxPageSize: 100 })");
    expect(contractorRepo).toContain(".range(page.from, page.to)");
  });

  it("paginates buyer counterparty suggestion list reads with stable ordering", () => {
    const source = read("src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts");

    expect(source).toContain("BUYER_COUNTERPARTY_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(source.match(/normalizePage\(pageInput, BUYER_COUNTERPARTY_PAGE_DEFAULTS\)/g)).toHaveLength(5);
    expect(source).toContain('.order("company_name", { ascending: true })');
    expect(source).toContain('.order("contractor_org", { ascending: true })');
    expect(source).toContain('.order("supplier", { ascending: true })');
    expect(source.match(/\.order\("id", \{ ascending: true \}\)/g)).toHaveLength(5);
    expect(source.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(5);
    expect(source).not.toContain(".limit(3000)");
    expect(source).not.toContain(".limit(2000)");
  });

  it("paginates notifications without changing role filtering", () => {
    const source = read("src/lib/api/notifications.ts");

    expect(source).toContain('normalizePage({ pageSize: limit }, { pageSize: 20, maxPageSize: 100 })');
    expect(source).toContain('.eq("role", role)');
    expect(source).toContain('.order("created_at", { ascending: false })');
    expect(source).toContain('.order("id", { ascending: false })');
    expect(source).toContain(".range(page.from, page.to)");
  });

  it("does not cap PDF/report/export/detail full reads in this batch", () => {
    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    const proposalApi = read("src/lib/api/proposals.ts");

    expect(pdfProposal).not.toContain(".range(page.from, page.to)");
    expect(pdfBuilder).not.toContain(".range(page.from, page.to)");
    expect(warehouseRepo).not.toContain(".range(page.from, page.to)");
    expect(proposalApi).toContain("proposalItems");
    expect(proposalApi).not.toContain("proposalItems(proposalId: string | number, pageInput");
  });
});
