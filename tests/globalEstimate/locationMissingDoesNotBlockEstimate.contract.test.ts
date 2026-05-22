import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("location missing does not block estimate", () => {
  it("returns approximate estimate with low confidence and clarifying questions", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "need laminate installation 100 m2" });
    expect(result.locale.countryCode).toBe("XX");
    expect(result.confidence).toBe("low");
    expect(result.totals.grandTotal).toBeGreaterThan(0);
    expect(answer).toMatch(/clarify|уточните/i);
  });
});
