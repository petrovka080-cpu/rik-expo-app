import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate missing location contract", () => {
  it("returns approximate estimate with assumptions instead of blocking", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "laminate installation 100 m2", language: "en" });

    expect(result.totals.grandTotal).toBeGreaterThan(0);
    expect(result.locale.confidence).toBe("low");
    expect(answer).toContain("|");
  });
});
