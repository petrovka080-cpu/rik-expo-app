import { validatePricedRateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("source governance supplier evidence", () => {
  it("fails fake or unsupported supplier labels", () => {
    const fakeLabel = validatePricedRateSourceEvidence({
      unitPrice: null,
      sourceId: "catalog_items",
      sourceLabel: "fake supplier found",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
    const missingEvidence = validatePricedRateSourceEvidence({
      unitPrice: null,
      supplierName: "Real supplier text without evidence",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
    expect(fakeLabel.fakeSupplierFound).toBe(true);
    expect(missingEvidence.fakeSupplierFound).toBe(true);
  });
});
