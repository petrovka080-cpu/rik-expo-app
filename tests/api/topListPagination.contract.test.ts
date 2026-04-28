import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("S-PAG-3A top list pagination contract", () => {
  it("keeps buyer and proposal legacy list reads behind stable range windows", () => {
    const buyerApi = read("src/lib/api/buyer.ts");
    const proposalsApi = read("src/lib/api/proposals.ts");
    const buyerBucketsRepo = read("src/screens/buyer/buyer.buckets.repo.ts");

    expect(buyerApi).toContain("normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })");
    expect(buyerApi).toContain('.order("submitted_at", { ascending: false })');
    expect(buyerApi).toContain('.order("id", { ascending: false })');
    expect(buyerApi).toContain(".range(page.from, page.to)");

    expect(proposalsApi).toContain("normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })");
    expect(proposalsApi).toContain('.order("submitted_at", { ascending: false })');
    expect(proposalsApi).toContain('.order("id", { ascending: false })');
    expect(proposalsApi).toContain(".range(page.from, page.to)");

    expect(buyerBucketsRepo).toContain('.order("proposal_id", { ascending: false })');
    expect(buyerBucketsRepo).toContain('.order("id", { ascending: false })');
    expect(buyerBucketsRepo.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(2);
  });

  it("keeps contractor legacy work list bounded without changing PDF/report/detail reads", () => {
    const contractorRepo = read("src/screens/contractor/contractor.loadWorksService.ts");
    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");

    expect(contractorRepo).toContain("normalizePage(undefined, { pageSize: 100, maxPageSize: 100 })");
    expect(contractorRepo).toContain('.from("v_works_fact")');
    expect(contractorRepo).toContain('.order("created_at", { ascending: false })');
    expect(contractorRepo).toContain('.order("progress_id", { ascending: false })');
    expect(contractorRepo).toContain(".range(page.from, page.to)");

    expect(pdfProposal).not.toContain(".range(page.from, page.to)");
    expect(pdfBuilder).not.toContain(".range(page.from, page.to)");
    expect(warehouseRepo).not.toContain(".range(page.from, page.to)");
  });
});
