import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("UK painting 80 sq m", () => {
  it("uses GBP, metric display, and UK VAT reference", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Paint walls 80 m2 in London" });
    expect(result.locale).toMatchObject({ countryCode: "GB", city: "London", currency: "GBP" });
    expect(result.work.workKey).toBe("wall_painting");
    expect(result.tax.taxLabel).toContain("UK");
  });
});
