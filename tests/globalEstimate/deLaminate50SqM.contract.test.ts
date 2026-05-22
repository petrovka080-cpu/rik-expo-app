import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("DE laminate 50 sq m", () => {
  it("uses German locale, EUR, metric units, and VAT status", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Laminat verlegen 50 Quadratmeter in Deutschland" });
    expect(result.locale).toMatchObject({ countryCode: "DE", currency: "EUR", unitSystem: "metric" });
    expect(result.work.workKey).toBe("laminate_laying");
    expect(result.tax.taxType).toBe("vat");
  });
});
