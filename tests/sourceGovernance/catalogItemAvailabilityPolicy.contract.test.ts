import { validateCatalogAvailabilityPolicy } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("catalog item availability policy", () => {
  it("allows available and in-stock only with real catalog item source", () => {
    const allowed = validateCatalogAvailabilityPolicy({
      catalogItemId: "cat-1",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
      availabilityStatus: "available",
      stockStatus: "in_stock",
    });
    const blocked = validateCatalogAvailabilityPolicy({
      availabilityStatus: "available",
      stockStatus: "in_stock",
      sourceLabel: "supplier found",
    });
    expect(allowed).toEqual([]);
    expect(blocked.map((failure) => failure.code)).toEqual(expect.arrayContaining([
      "AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE",
      "IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE",
      "FAKE_SUPPLIER",
    ]));
  });
});
