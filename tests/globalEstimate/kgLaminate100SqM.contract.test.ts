import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("KG laminate 100 sq m", () => {
  it("uses metric units, KGS, and NDS status for Bishkek", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "смета ламинат 100 м2 Бишкек", language: "ru" });
    expect(result.locale).toMatchObject({ countryCode: "KG", city: "Bishkek", currency: "KGS", unitSystem: "metric" });
    expect(result.tax.taxType).toBe("nds");
  });
});
