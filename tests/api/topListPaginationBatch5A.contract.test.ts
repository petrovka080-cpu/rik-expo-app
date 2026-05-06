import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-PAG-5A contractor foreman buyer pagination contract", () => {
  it("keeps previous pagination waves closed", () => {
    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain('.order("submitted_at", { ascending: false })');
    expect(proposals).toContain('.order("id", { ascending: false })');
    expect(proposals).toContain(".range(page.from, page.to)");

    const buyerBuckets = read("src/screens/buyer/buyer.buckets.repo.ts");
    expect(
      buyerBuckets.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);

    const buyerCounterparty = read(
      "src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts",
    );
    expect(
      buyerCounterparty.match(/\.range\(page\.from, page\.to\)/g),
    ).toHaveLength(5);

    const notifications = read("src/lib/api/notifications.ts");
    expect(notifications).toContain(
      '.order("created_at", { ascending: false })',
    );
    expect(notifications).toContain('.order("id", { ascending: false })');
    expect(notifications).toContain(".range(page.from, page.to)");

    const supplierShowcase = read(
      "src/features/supplierShowcase/supplierShowcase.data.ts",
    );
    expect(
      supplierShowcase.match(/\.range\(page\.from, page\.to\)/g),
    ).toHaveLength(2);

    const catalogTransport = read("src/lib/catalog/catalog.transport.supabase.ts");
    expect(
      catalogTransport.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it("paginates foreman dictionary and app option list reads without silently capping completeness", () => {
    const foremanDicts = read("src/screens/foreman/foreman.dicts.repo.ts");

    expect(foremanDicts).toContain("const FOREMAN_DICT_LIST_PAGE_DEFAULTS = {");
    expect(foremanDicts).toContain("maxRows: 5000");
    expect(foremanDicts).toContain("loadPagedRowsWithCeiling<T>");
    expect(foremanDicts).toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(foremanDicts).not.toContain("while (true)");
    expect(foremanDicts).not.toContain(".limit(100)");

    expect(foremanDicts).toContain('.from("ref_object_types")');
    expect(foremanDicts).toContain('.from("ref_levels")');
    expect(foremanDicts).toContain('.from("ref_systems")');
    expect(foremanDicts).toContain('.from("ref_zones")');
    expect(foremanDicts).toContain('.from("rik_apps")');
    expect(foremanDicts).toContain('.from("rik_item_apps")');

    expect(foremanDicts.match(/loadPagedForemanRows</g)).toHaveLength(6);
    expect(
      foremanDicts.match(/\.order\(orderColumn, \{ ascending: true \}\)/g),
    ).toHaveLength(4);
    expect(foremanDicts.match(/\.order\("code",/g)).toHaveLength(4);
    expect(foremanDicts.match(/\.order\("app_code",/g)).toHaveLength(2);
    expect(foremanDicts).toContain(
      'if (msg.includes("name_ru")) result = await run(fallbackSelect)',
    );
    expect(foremanDicts).toContain("readForemanDictsSnapshot");
    expect(foremanDicts).toContain("FOREMAN_DICTS_TTL_MS");
    expect(foremanDicts).toContain(
      "readCached(appOptionsCache, FOREMAN_APPS_TTL_MS, loadForemanAppOptions)",
    );
  });

  it("does not cap S-PAG-5A PDF, report, detail, seed, integrity, job-queue, or buyer detail reads", () => {
    const contractorData = read("src/screens/contractor/contractor.data.ts");
    expect(contractorData).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(contractorData).toContain('.eq("progress_id", progressId)');
    expect(contractorData).toContain('.in("log_id", logIds)');

    const buyerRepo = read("src/screens/buyer/buyer.repo.ts");
    expect(buyerRepo).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(buyerRepo).not.toContain("loadPagedForemanRows");
    expect(buyerRepo).toContain('.eq("proposal_id", pidStr)');

    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    expect(warehouseRepo).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLedgerRows");

    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    expect(pdfProposal).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(pdfProposal).not.toContain(".range(page.from, page.to)");

    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    expect(pdfBuilder).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(pdfBuilder).not.toContain(".range(page.from, page.to)");

    const integrityGuards = read("src/lib/api/integrity.guards.ts");
    expect(integrityGuards).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(integrityGuards).toContain("chunkIds(requestIds, 150)");

    const warehouseSeed = read("src/screens/warehouse/warehouse.seed.ts");
    expect(warehouseSeed).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(warehouseSeed).toContain("seedEnsureIncomingItems");

    const jobQueue = read("src/lib/infra/jobQueue.ts");
    expect(jobQueue).not.toContain("FOREMAN_DICT_LIST_PAGE_DEFAULTS");
    expect(jobQueue).toContain(".insert(payload)");
  });
});
