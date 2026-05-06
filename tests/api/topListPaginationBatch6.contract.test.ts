import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-PAG-6 remaining safe list pagination contract", () => {
  it("keeps previous pagination waves closed", () => {
    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain('.order("submitted_at", { ascending: false })');
    expect(proposals).toContain('.order("id", { ascending: false })');
    expect(proposals).toContain(".range(page.from, page.to)");

    const buyerApi = read("src/lib/api/buyer.ts");
    expect(buyerApi).toContain(
      "normalizePage(pageInput, { pageSize: 50, maxPageSize: 100 })",
    );
    expect(buyerApi).toContain(".range(page.from, page.to)");

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

    const supplierShowcase = read(
      "src/features/supplierShowcase/supplierShowcase.transport.ts",
    );
    expect(
      supplierShowcase.match(/\.range\(page\.from, page\.to\)/g),
    ).toHaveLength(2);

    const catalogTransport = read("src/lib/catalog/catalog.transport.supabase.ts");
    expect(
      catalogTransport.match(/\.range\(page\.from, page\.to\)/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);

    const foremanDicts = read("src/screens/foreman/foreman.dicts.repo.ts");
    expect(foremanDicts.match(/loadPagedForemanRows</g)).toHaveLength(6);

    const directorRepository = read(
      "src/screens/director/director.repository.ts",
    );
    expect(directorRepository).toContain(
      "DIRECTOR_FALLBACK_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }",
    );
    expect(directorRepository).toContain(
      "queryFactory().range(page.from, page.to)",
    );

    const suppliers = read("src/lib/api/suppliers.ts");
    expect(suppliers).toContain("const SUPPLIER_LIST_PAGE_DEFAULTS = {");
    expect(suppliers).toContain("maxRows: 5000");
    expect(suppliers).toContain("loadPagedRowsWithCeiling<T>");
    expect(
      suppliers.match(/loadPagedSupplierRows/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it("paginates S-PAG-6 UI list, autocomplete, map, invite, dictionary, and field reads", () => {
    const profileServices = read("src/screens/profile/profile.services.ts");
    expect(profileServices).toContain(
      "PROFILE_LISTINGS_PAGE_DEFAULTS = { pageSize: 20, maxPageSize: 20 }",
    );
    expect(profileServices).toContain(
      '.order("created_at", { ascending: false })',
    );
    expect(profileServices).toContain('.order("id", { ascending: false })');
    expect(profileServices).toContain(
      ".range(listingsPage.from, listingsPage.to)",
    );
    expect(profileServices).toContain(
      "const PROFILE_MEMBERSHIP_PAGE_DEFAULTS = {",
    );
    expect(profileServices).toContain("maxRows: 5000");
    expect(profileServices).toContain(
      "async function loadCompanyMembershipRows",
    );
    expect(profileServices).toContain('.order("company_id",');
    expect(profileServices).toContain(
      "loadPagedRowsWithCeiling<CompanyMembershipRow>",
    );
    expect(profileServices).toContain(
      "PROFILE_CATALOG_SEARCH_PAGE_DEFAULTS = { pageSize: 15, maxPageSize: 15 }",
    );
    expect(profileServices).toContain(
      '.order("name_human_ru", { ascending: true })',
    );
    expect(profileServices).toContain(
      '.order("rik_code", { ascending: true })',
    );

    const officeAccess = read("src/screens/office/officeAccess.services.ts");
    expect(officeAccess).toContain(
      "OFFICE_INVITES_PAGE_DEFAULTS = { pageSize: 30, maxPageSize: 30 }",
    );
    expect(officeAccess).toContain(
      '.order("created_at", { ascending: false })',
    );
    expect(officeAccess).toContain('.order("id", { ascending: false })');
    expect(officeAccess).toContain(".range(page.from, page.to)");

    const mapListings = read("src/components/map/useMapListingsQuery.ts");
    expect(mapListings).toContain(
      "MAP_LISTINGS_PAGE_DEFAULTS = { pageSize: 2000, maxPageSize: 2000 }",
    );
    expect(mapListings).toContain('.order("id", { ascending: true })');
    expect(mapListings).toContain(".range(page.from, page.to)");
    expect(mapListings).not.toContain(".limit(2000)");

    const warehouseDicts = read(
      "src/screens/warehouse/warehouse.dicts.repo.ts",
    );
    expect(warehouseDicts).toContain(
      "WAREHOUSE_DICT_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }",
    );
    expect(warehouseDicts).toContain("async function loadPagedWarehouseRows");
    expect(warehouseDicts).toContain(
      "loadPagedRowsWithCeiling(queryFactory, WAREHOUSE_DICT_PAGE_DEFAULTS)",
    );
    expect(warehouseDicts).not.toContain("while (true)");
    expect(warehouseDicts).not.toContain(".limit(1000)");
    expect(warehouseDicts).not.toContain(".limit(2000)");

    const calcFields = read("src/components/foreman/useCalcFields.ts");
    expect(calcFields).toContain("const CALC_FIELDS_PAGE_DEFAULTS = {");
    expect(calcFields).toContain("maxRows: 5000");
    expect(calcFields).toContain("async function fetchCalcFieldRows");
    expect(calcFields).toContain('.order("sort_order", { ascending: true })');
    expect(calcFields).toContain('.order("basis_key",');
    expect(calcFields).toContain("loadPagedRowsWithCeiling<unknown>");
  });

  it("does not cap forbidden PDF, report, detail, integrity, queue, stock, package, or native surfaces", () => {
    const pdfProposal = read("src/lib/api/pdf_proposal.ts");
    expect(pdfProposal).not.toContain(".range(");

    const pdfBuilder = read("src/lib/pdf/pdf.builder.ts");
    expect(pdfBuilder).not.toContain(".range(");

    const warehouseRepo = read("src/screens/warehouse/warehouse.api.repo.ts");
    expect(warehouseRepo).not.toContain(".range(");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLedgerRows");
    expect(warehouseRepo).toContain("fetchWarehouseIncomingLineRows");

    const integrityGuards = read("src/lib/api/integrity.guards.ts");
    expect(integrityGuards).not.toContain(".range(");
    expect(integrityGuards).toContain("chunkIds(requestIds, 150)");

    const jobQueue = read("src/lib/infra/jobQueue.ts");
    expect(jobQueue).not.toContain(".range(");
    expect(jobQueue).toContain(".insert(payload)");

    const packageJson = read("package.json");
    expect(packageJson).not.toContain("S-PAG-6");

    expect(existsSync(join(root, "ios"))).toBe(false);
  });

  it("requires no production or staging env and keeps matrix JSON valid", () => {
    const changedSources = [
      "src/screens/profile/profile.services.ts",
      "src/screens/office/officeAccess.services.ts",
      "src/components/map/useMapListingsQuery.ts",
      "src/screens/warehouse/warehouse.dicts.repo.ts",
      "src/components/foreman/useCalcFields.ts",
    ]
      .map(read)
      .join("\n");

    expect(changedSources).not.toMatch(
      /PROD_|STAGING_|SENTRY_|SUPABASE_REALTIME_/,
    );

    const matrix = JSON.parse(
      read("artifacts/S_PAG_6_remaining_safe_list_pagination_matrix.json"),
    );
    expect(matrix.wave).toBe("S-PAG-6");
    expect(matrix.result.fixedCallSites).toBe(8);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.stagingTouched).toBe(false);
    expect(matrix.safety.otaPublished).toBe(false);
    expect(matrix.safety.easBuildTriggered).toBe(false);
    expect(matrix.safety.playMarketTouched).toBe(false);
  });
});
