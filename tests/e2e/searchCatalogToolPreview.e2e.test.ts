import {
  SEARCH_CATALOG_ROUTE_SCOPE,
  runSearchCatalogToolSafeRead,
} from "../../src/features/ai/tools/searchCatalogTool";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("search_catalog tool preview e2e", () => {
  it("returns a bounded SAFE_READ preview envelope with evidence refs and zero mutations", async () => {
    const preview = await runSearchCatalogToolSafeRead({
      auth: directorAuth,
      input: {
        query: "арматура",
        category: "material",
        limit: 2,
      },
      searchCatalogItems: async (query, limit, apps) => {
        expect({ query, limit, apps }).toEqual({
          query: "арматура",
          limit: 2,
          apps: ["material"],
        });
        return [
          { code: "ARM-12", name: "Арматура 12", uom: "м", kind: "material" },
          { code: "ARM-16", name: "Арматура 16", uom: "м", kind: "material" },
          { code: "ARM-20", name: "Арматура 20", uom: "м", kind: "material" },
        ];
      },
    });

    expect(preview).toMatchObject({
      ok: true,
      data: {
        bounded: true,
        route: SEARCH_CATALOG_ROUTE_SCOPE,
        mutation_count: 0,
        items: [
          {
            catalog_item_id: "ARM-12",
            evidence_ref: "catalog:marketplace.catalog.search:item:1",
          },
          {
            catalog_item_id: "ARM-16",
            evidence_ref: "catalog:marketplace.catalog.search:item:2",
          },
        ],
        evidence_refs: [
          "catalog:marketplace.catalog.search:item:1",
          "catalog:marketplace.catalog.search:item:2",
        ],
        cacheStatus: {
          scope: SEARCH_CATALOG_ROUTE_SCOPE,
          retained: true,
          route_count: 1,
        },
        rateLimitStatus: {
          scope: SEARCH_CATALOG_ROUTE_SCOPE,
          retained: true,
          route_count: 1,
        },
      },
    });
    if (!preview.ok) throw new Error("expected search_catalog preview success");
    expect(preview.data.items).toHaveLength(2);
  });
});
