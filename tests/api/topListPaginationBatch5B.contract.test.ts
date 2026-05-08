import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-PAG-5B director warehouse job queue pagination contract", () => {
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

    const foremanDicts = read("src/screens/foreman/foreman.dicts.repo.ts");
    expect(foremanDicts).toContain("const FOREMAN_DICT_LIST_PAGE_DEFAULTS = {");
    expect(foremanDicts).toContain("maxRows: 5000");
    expect(foremanDicts.match(/loadPagedForemanRows</g)).toHaveLength(6);
  });

  it("paginates director fallback windows without changing approval completeness", () => {
    const directorRepository = read(
      "src/screens/director/director.repository.ts",
    );
    expect(directorRepository).toContain(
      "DIRECTOR_FALLBACK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }",
    );
    expect(directorRepository).toContain(
      "normalizePage({ page: pageIndex }, DIRECTOR_FALLBACK_PAGE_DEFAULTS)",
    );
    expect(directorRepository).toContain(
      "queryFactory().range(page.from, page.to)",
    );
    expect(directorRepository).toContain(
      "if (pageRows.length < page.pageSize) return { data: rows, error: null }",
    );
    expect(directorRepository).toContain(
      '.order("submitted_at", { ascending: false })',
    );
    expect(directorRepository).toContain('.order("id", { ascending: false })');
    expect(directorRepository).toContain(
      '.order("request_id", { ascending: true })',
    );
    expect(directorRepository).toContain(
      '.in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))',
    );
    expect(directorRepository).not.toContain(".limit(100)");

    const directorData = read("src/screens/director/director.data.ts");
    expect(directorData).toContain(
      "DIRECTOR_DATA_FALLBACK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(directorData).toContain(
      "loadPagedRowsWithCeiling(queryFactory, DIRECTOR_DATA_FALLBACK_PAGE_DEFAULTS)",
    );
    expect(directorData).toContain(
      '.order("submitted_at", { ascending: false })',
    );
    expect(directorData).toContain('.order("request_id", { ascending: true })');
    expect(directorData).toContain(
      '.in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))',
    );
  });

  it("paginates supplier and foreman picker list reads with stable ordering", () => {
    const suppliers = read("src/lib/api/suppliers.ts");
    expect(suppliers).toContain("const SUPPLIER_LIST_PAGE_DEFAULTS = {");
    expect(suppliers).toContain("maxRows: 5000");
    expect(suppliers).toContain("loadPagedRowsWithCeiling<T>");
    expect(suppliers.match(/loadPagedSupplierRows</g)).toHaveLength(2);
    expect(suppliers).toContain('.from("suppliers")');
    expect(suppliers).toContain('.order("name", { ascending: true })');
    expect(suppliers).toContain('.order("id", {');
    expect(suppliers).toContain("ascending: true");
    expect(suppliers).toContain('.from("supplier_files")');
    expect(suppliers).toContain('.eq("supplier_id", supplierId)');
    expect(suppliers).toContain('.order("created_at", { ascending: false })');
    expect(suppliers).toContain('.order("id", { ascending: false })');
    expect(suppliers).toContain("return list.filter(");

    const workTypePicker = read("src/components/foreman/WorkTypePicker.tsx");
    expect(workTypePicker).toContain(
      "WORK_TYPE_PICKER_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }",
    );
    expect(workTypePicker).toContain(
      "normalizePage({ page: pageIndex }, WORK_TYPE_PICKER_PAGE_DEFAULTS)",
    );
    expect(workTypePicker).toContain(
      "queryFactory().range(page.from, page.to)",
    );
    expect(workTypePicker).toContain(".from('v_work_types_picker')");
    expect(workTypePicker).toContain(
      ".order('family_sort', { ascending: true })",
    );
    expect(workTypePicker).toContain(
      ".order('work_name_ru', { ascending: true })",
    );
    expect(workTypePicker).toContain(".order('code', { ascending: true })");
  });

  it("does not cap PDF, report, detail, warehouse, integrity, or job queue reads", () => {
    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    expect(warehouseRepo).not.toContain("DIRECTOR_FALLBACK_PAGE_DEFAULTS");
    expect(warehouseRepo).not.toContain(".range(");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLedgerRows");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLineRows");

    const integrityGuards = read("src/lib/api/integrity.guards.ts");
    expect(integrityGuards).not.toContain(".range(");
    expect(integrityGuards).toContain("chunkIds(requestIds, 150)");
    expect(integrityGuards).toContain("chunkIds(requestItemIds, 150)");

    const jobQueue = read("src/lib/infra/jobQueue.ts");
    expect(jobQueue).not.toContain(".range(");
    expect(jobQueue).toContain(".insert(payload)");
    expect(jobQueue).toContain(".single()");

    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    expect(pdfProposal).not.toContain(".range(");

    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    expect(pdfBuilder).not.toContain(".range(");

    const contractorData = read("src/screens/contractor/contractor.data.ts");
    expect(contractorData).toContain(
      "CONTRACTOR_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(contractorData).toContain("loadPagedContractorRows");
    expect(contractorData).toContain(
      "loadPagedRowsWithCeiling(queryFactory, CONTRACTOR_LIST_PAGE_DEFAULTS",
    );
    expect(contractorData).toContain('.eq("progress_id", progressId)');

    const buyerRepo = read("src/screens/buyer/buyer.repo.ts");
    const buyerRepoReadTransport = read("src/screens/buyer/buyer.repo.read.transport.ts");
    expect(buyerRepo).toContain(
      "BUYER_REPO_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(buyerRepo).toContain("loadPagedBuyerRepoRows");
    expect(buyerRepo).toContain(
      "loadPagedRowsWithCeiling(queryFactory, BUYER_REPO_LIST_PAGE_DEFAULTS",
    );
    expect(buyerRepo).toContain("createBuyerProposalItemsForViewQuery(supabase, pidStr)");
    expect(buyerRepoReadTransport).toContain('.eq("proposal_id", proposalId)');
  });
});
