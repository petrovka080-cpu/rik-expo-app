import { validateCatalogAvailabilityPolicy } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("source governance availability", () => {
  it("fails available status without real catalog evidence", () => {
    const failures = validateCatalogAvailabilityPolicy({
      availabilityStatus: "available",
      stockStatus: "unknown",
      sourceId: null,
      catalogItemId: null,
    });
    expect(failures.map((failure) => failure.code)).toContain("AVAILABLE_WITHOUT_REAL_CATALOG_SOURCE");
  });
});
