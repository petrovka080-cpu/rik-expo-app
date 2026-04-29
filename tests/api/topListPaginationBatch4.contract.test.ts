import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-PAG-5 remaining unbounded selects triage contract", () => {
  it("keeps previous pagination waves closed", () => {
    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain(".order(\"submitted_at\", { ascending: false })");
    expect(proposals).toContain(".order(\"id\", { ascending: false })");
    expect(proposals).toContain(".range(page.from, page.to)");

    const buyerApi = read("src/lib/api/buyer.ts");
    expect(buyerApi).toContain("normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })");
    expect(buyerApi).toContain(".range(page.from, page.to)");

    const buyerBuckets = read("src/screens/buyer/buyer.buckets.repo.ts");
    expect(buyerBuckets.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(2);

    const buyerCounterparty = read("src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts");
    expect(buyerCounterparty.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(5);
    expect(buyerCounterparty).not.toContain(".limit(3000)");
    expect(buyerCounterparty).not.toContain(".limit(2000)");

    const notifications = read("src/lib/api/notifications.ts");
    expect(notifications).toContain(".order(\"created_at\", { ascending: false })");
    expect(notifications).toContain(".order(\"id\", { ascending: false })");
    expect(notifications).toContain(".range(page.from, page.to)");

    const supplierShowcase = read("src/features/supplierShowcase/supplierShowcase.data.ts");
    expect(supplierShowcase.match(/\.range\(page\.from, page\.to\)/g)).toHaveLength(2);

    const catalogTransport = read("src/lib/catalog/catalog.transport.ts");
    expect(catalogTransport.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("does not cap S-PAG-5 PDF, report, detail, seed, integrity, or job-queue reads", () => {
    const contractorData = read("src/screens/contractor/contractor.data.ts");
    expect(contractorData).not.toContain("normalizePage(");
    expect(contractorData).not.toContain(".range(");
    expect(contractorData).toContain(".eq(\"progress_id\", progressId)");
    expect(contractorData).toContain(".in(\"log_id\", logIds)");

    const buyerRepo = read("src/screens/buyer/buyer.repo.ts");
    expect(buyerRepo).not.toContain("normalizePage(");
    expect(buyerRepo).not.toContain(".range(");
    expect(buyerRepo).toContain(".eq(\"proposal_id\", pidStr)");

    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    expect(warehouseRepo).not.toContain("normalizePage(");
    expect(warehouseRepo).not.toContain(".range(");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLedgerRows");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLineRows");

    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    expect(pdfProposal).not.toContain("normalizePage(");
    expect(pdfProposal).not.toContain(".range(");

    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    expect(pdfBuilder).not.toContain("normalizePage(");
    expect(pdfBuilder).not.toContain(".range(");

    const integrityGuards = read("src/lib/api/integrity.guards.ts");
    expect(integrityGuards).not.toContain("normalizePage(");
    expect(integrityGuards).not.toContain(".range(");
    expect(integrityGuards).toContain("chunkIds(requestIds, 150)");
    expect(integrityGuards).toContain("chunkIds(requestItemIds, 150)");

    const warehouseSeed = read("src/screens/warehouse/warehouse.seed.ts");
    expect(warehouseSeed).not.toContain("normalizePage(");
    expect(warehouseSeed).not.toContain(".range(");
    expect(warehouseSeed).toContain("seedEnsureIncomingItems");

    const jobQueue = read("src/lib/infra/jobQueue.ts");
    expect(jobQueue).not.toContain("normalizePage(");
    expect(jobQueue).not.toContain(".range(");
    expect(jobQueue).toContain(".insert(payload)");
    expect(jobQueue).toContain(".single()");
  });
});
