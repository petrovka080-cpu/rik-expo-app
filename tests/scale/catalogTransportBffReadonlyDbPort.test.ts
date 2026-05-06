import {
  buildCatalogTransportReadQueryPlan,
  createCatalogTransportBffReadonlyDbPort,
} from "../../scripts/server/stagingBffCatalogTransportReadPort";

describe("catalog transport BFF readonly DB port", () => {
  it("builds deterministic bounded reference list plans", () => {
    const suppliers = buildCatalogTransportReadQueryPlan({
      operation: "catalog.supplier_counterparty.list",
      args: { searchTerm: "cement" },
    });
    const groups = buildCatalogTransportReadQueryPlan({
      operation: "catalog.groups.list",
      args: {},
    });

    expect(suppliers).toEqual(
      expect.objectContaining({
        operation: "catalog.supplier_counterparty.list",
        values: ["%cement%", 5001],
        maxRows: 5000,
        readOnly: true,
      }),
    );
    expect(suppliers.sql).toContain("order by name asc, id asc");
    expect(groups.sql).toContain("from public.catalog_groups_clean");
    expect(groups.sql).toContain("order by code asc");
    expect(groups.values).toEqual([5001]);
  });

  it("keeps rik_items outputs explicit preview reads with deterministic ordering", () => {
    const catalogFallback = buildCatalogTransportReadQueryPlan({
      operation: "catalog.search.fallback",
      args: { searchTerm: "ignored", tokens: ["cement", "bolt"], limit: 250 },
    });
    const quickFallback = buildCatalogTransportReadQueryPlan({
      operation: "catalog.rik_quick_search.fallback",
      args: { searchTerm: "ignored", tokens: ["cement", "bolt"], limit: 250 },
    });

    expect(catalogFallback.values).toEqual(["%cement%", "%bolt%", 100]);
    expect(catalogFallback.sql).toContain("(name_human ilike $1 or rik_code ilike $1)");
    expect(catalogFallback.sql).toContain("and (name_human ilike $2 or rik_code ilike $2)");
    expect(catalogFallback.sql).toContain("order by rik_code asc, name_human asc, id asc");
    expect(quickFallback.values).toEqual(["%cement%", "%bolt%", 100]);
    expect(quickFallback.sql).toContain("name_human ilike $1 or rik_code ilike $1");
    expect(quickFallback.sql).toContain("name_human ilike $2 or rik_code ilike $2");
    expect(quickFallback.maxRows).toBe(100);
  });

  it("keeps catalog_items search as an explicit bounded preview read", () => {
    const search = buildCatalogTransportReadQueryPlan({
      operation: "catalog.items.search.preview",
      args: { searchTerm: "cement", kind: "material", pageSize: 250 },
    });
    const unfiltered = buildCatalogTransportReadQueryPlan({
      operation: "catalog.items.search.preview",
      args: { searchTerm: "", kind: "all", pageSize: 60 },
    });

    expect(search.sql).toContain("from public.catalog_items");
    expect(search.sql).toContain(
      "search_blob ilike $1 or name_search ilike $1 or name_human ilike $1 or rik_code ilike $1",
    );
    expect(search.sql).toContain("kind = $2");
    expect(search.sql).toContain("order by rik_code asc, id asc");
    expect(search.values).toEqual(["%cement%", "material", 100]);
    expect(search.maxRows).toBe(100);
    expect(unfiltered.sql).not.toContain("where");
    expect(unfiltered.values).toEqual([60]);
  });

  it("preserves RPC argument omission semantics while bounding returned rows", () => {
    const suppliersNoSearch = buildCatalogTransportReadQueryPlan({
      operation: "catalog.suppliers.rpc",
      args: { searchTerm: null },
    });
    const rikTypedNoApps = buildCatalogTransportReadQueryPlan({
      operation: "catalog.search.rpc",
      args: {
        fn: "rik_quick_search_typed",
        args: { p_q: "cement", p_limit: 20, p_apps: null },
      },
    });
    const rikTypedWithApps = buildCatalogTransportReadQueryPlan({
      operation: "catalog.search.rpc",
      args: {
        fn: "rik_quick_search_typed",
        args: { p_q: "cement", p_limit: 20, p_apps: ["market"] },
      },
    });

    expect(suppliersNoSearch.sql).toBe("select * from public.suppliers_list() limit $1");
    expect(suppliersNoSearch.values).toEqual([5001]);
    expect(rikTypedNoApps.sql).toBe(
      "select * from public.rik_quick_search_typed(p_q => $1, p_limit => $2)",
    );
    expect(rikTypedNoApps.values).toEqual(["cement", 20]);
    expect(rikTypedWithApps.sql).toBe(
      "select * from public.rik_quick_search_typed(p_q => $1, p_limit => $2, p_apps => $3::text[])",
    );
    expect(rikTypedWithApps.values).toEqual(["cement", 20, ["market"]]);
  });

  it("does not create a DB port without the readonly connection boundary", () => {
    expect(createCatalogTransportBffReadonlyDbPort({})).toBeUndefined();
  });
});
