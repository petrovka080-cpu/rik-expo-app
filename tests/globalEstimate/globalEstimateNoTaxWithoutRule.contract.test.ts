import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate no tax without rule contract", () => {
  it("uses unknown tax with a precision warning instead of inventing US state sales tax", async () => {
    const { result } = await buildGlobalEstimateFixture({
      text: "Need laminate installation for 1000 sq ft in Texas",
      language: "en",
    });

    expect(result.tax.taxType).toBe("unknown");
    expect(result.tax.requiresLocationPrecision).toBe(true);
    expect(result.tax.warning).toMatch(/ZIP|address|postal/i);
  });
});
