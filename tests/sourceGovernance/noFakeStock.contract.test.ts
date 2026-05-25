import { validateCatalogAvailabilityPolicy } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("source governance stock", () => {
  it("fails in-stock status without real catalog evidence", () => {
    const failures = validateCatalogAvailabilityPolicy({
      availabilityStatus: "unknown",
      stockStatus: "in_stock",
      sourceId: null,
      catalogItemId: null,
    });
    expect(failures.map((failure) => failure.code)).toContain("IN_STOCK_WITHOUT_REAL_CATALOG_SOURCE");
  });
});
