import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-FETCHALL-UNBOUNDED-READS-CLOSEOUT-1", () => {
  it("keeps catalog reference list reads paged with an explicit fail-closed ceiling", () => {
    const source = read("src/lib/catalog/catalog.transport.ts");

    expect(source).toContain("CATALOG_SAFE_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }");
    expect(source).toContain("loadPagedRowsWithCeiling<T>");
    expect(source).toContain("toCatalogQueryError");
    expect(source).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
  });

  it("keeps catalog request reads on the shared bounded reference reader", () => {
    const source = read("src/lib/catalog/catalog.request.transport.ts");

    expect(source).toContain("CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS");
    expect(source).toContain("maxRows: 5000");
    expect(source).toContain("loadPagedRowsWithCeiling<Record<string, unknown>>");
    expect(source).toContain(".order(\"row_no\", { ascending: true })");
    expect(source).toContain(".order(\"position_order\", { ascending: true })");
    expect(source).toContain(".order(\"id\", { ascending: true })");
  });

  it("keeps warehouse dictionary reads paged with an explicit fail-closed ceiling", () => {
    const source = read("src/screens/warehouse/warehouse.dicts.repo.ts");

    expect(source).toContain("WAREHOUSE_DICT_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }");
    expect(source).toContain("loadPagedRowsWithCeiling(queryFactory, WAREHOUSE_DICT_PAGE_DEFAULTS)");
    expect(source).not.toContain("while (true)");
  });

  it("closes director report full-table aggregation through the typed server contract", () => {
    const factSource = read("src/lib/api/director_reports.transport.facts.ts");
    const disciplineSource = read("src/lib/api/director_reports.transport.discipline.ts");
    const reportService = read("src/lib/api/director_reports.service.report.ts");
    const optionsService = read("src/lib/api/director_reports.service.options.ts");
    const disciplineService = read("src/lib/api/director_reports.service.discipline.ts");

    expect(factSource).toContain("createDirectorReportsAggregationContractRequiredError");
    expect(disciplineSource).toContain("createDirectorReportsAggregationContractRequiredError");
    expect(factSource).not.toContain("while (true)");
    expect(disciplineSource).not.toContain("while (true)");
    expect(reportService).toContain("loadDirectorReportTransportScope");
    expect(optionsService).toContain("loadDirectorReportTransportScope");
    expect(disciplineService).toContain("loadDirectorReportTransportScope");
  });

  it("keeps director subcontract PDF report model loading on the typed server source", () => {
    const source = read("src/lib/api/pdf_director.data.ts");

    expect(source).toContain("getDirectorSubcontractPdfSource");
    expect(source).toContain("prepareDirectorSubcontractReportPdfModelFromRows(p, source.rows)");
    expect(source).not.toContain('.from("subcontracts")');
    expect(source).not.toContain(".from('subcontracts')");
  });

  it("keeps catalog request direct Supabase bypass closed", () => {
    const source = read("src/lib/catalog/catalog.request.service.ts");

    expect(source).not.toMatch(/supabase\.(from|rpc)\(/);
  });
});
