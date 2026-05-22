import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("no tax without tax rule", () => {
  it("returns unknown tax with warning instead of inventing a tax amount", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Texas" });
    expect(result.tax.taxType).toBe("unknown");
    expect(result.tax.taxAmount).toBe(0);
    expect(result.tax.warning).toMatch(/ZIP|address/i);
  });
});
