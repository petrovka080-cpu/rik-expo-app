import { validatePricedRateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("source governance price source discipline", () => {
  it("fails priced rows without source identity", () => {
    const validation = validatePricedRateSourceEvidence({
      unitPrice: 100,
      sourceId: null,
      evidence: [],
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
    expect(validation.ok).toBe(false);
    expect(validation.priceWithoutSourceFound).toBe(true);
    expect(validation.failures.map((failure) => failure.code)).toContain("PRICE_WITHOUT_SOURCE");
  });
});
