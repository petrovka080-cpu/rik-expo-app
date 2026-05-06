import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-WAREHOUSE-LIFECYCLE-AND-DICTS-UNBOUNDED-PAGINATION-CLOSEOUT-1", () => {
  it("keeps lifecycle bootstrap free of direct list reads", () => {
    const lifecycle = read("src/screens/warehouse/hooks/useWarehouseLifecycle.ts");

    expect(lifecycle).toContain("const loadAll = useCallback(async () => {");
    expect(lifecycle).toContain("Promise.allSettled");
    expect(lifecycle).not.toContain(".select(");
    expect(lifecycle).not.toContain(".range(");
    expect(lifecycle).not.toContain("while (true)");
  });

  it("uses maxRows and maxPages ceilings for warehouse dictionary/reference readers", () => {
    const expectations = [
      {
        path: "src/screens/warehouse/warehouse.dicts.repo.ts",
        defaults: "WAREHOUSE_DICT_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }",
        helper: "loadPagedRowsWithCeiling(queryFactory, WAREHOUSE_DICT_PAGE_DEFAULTS)",
        order: ".order(orderColumn, { ascending: true })",
      },
      {
        path: "src/screens/warehouse/warehouse.api.repo.transport.ts",
        defaults: "WAREHOUSE_API_BFF_REFERENCE_PAGE_DEFAULTS",
        helper: "loadPagedRowsWithCeiling<WarehouseApiUnknownRow>",
        order: ".order(\"code\", { ascending: true })",
      },
      {
        path: "src/screens/warehouse/warehouse.seed.ts",
        defaults: "WAREHOUSE_SEED_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }",
        helper: "loadPagedRowsWithCeiling<PurchaseItemSeedRow>",
        order: ".order(\"id\", { ascending: true })",
      },
      {
        path: "src/screens/warehouse/warehouse.stockReports.service.ts",
        defaults: "WAREHOUSE_STOCK_REFERENCE_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }",
        helper: "loadPagedRowsWithCeiling<UnknownRow>",
        order: ".order(\"code\", { ascending: true })",
      },
    ];

    for (const expectation of expectations) {
      const source = read(expectation.path);
      expect(source).toContain(expectation.defaults);
      expect(source).toContain(expectation.helper);
      expect(source).toContain(expectation.order);
      expect(source).not.toContain("while (true)");
      expect(source).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
    }
  });

  it("moves the warehouse name map read off manual open pagination", () => {
    const source = read("src/screens/warehouse/warehouse.nameMap.ui.ts");

    expect(source).toContain("WAREHOUSE_NAME_MAP_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000, maxPages: 51 }");
    expect(source).toContain("loadPagedRowsWithCeiling<UnknownRow>");
    expect(source).toContain(".order(\"code\", { ascending: true })");
    expect(source).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
    expect(source).not.toContain("codes.slice(0, 5000)");
  });

  it("keeps the shared page-through reader finite under a maxPages guard", () => {
    const source = read("src/lib/api/_core.ts");

    expect(source).toContain("maxPages?: number");
    expect(source).toContain("const maxPages = deriveMaxPages(defaults, maxRows)");
    expect(source).toContain("pageIndex < maxPages");
    expect(source).not.toContain("for (let pageIndex = 0; ; pageIndex += 1)");
  });
});
