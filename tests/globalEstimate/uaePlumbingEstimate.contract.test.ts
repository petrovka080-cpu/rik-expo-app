import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("UAE plumbing estimate", () => {
  it("returns AED plumbing BOQ with UAE VAT status", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Dubai plumbing repair set" });
    expect(result.locale).toMatchObject({ countryCode: "AE", city: "Dubai", currency: "AED" });
    expect(result.work.workKey).toBe("plumbing_basic");
    expect(result.tax.taxType).toBe("vat");
  });
});
