import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("dangerous work safety", () => {
  it("returns estimate/request preparation only and no DIY guidance for electrical work", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "Electrical socket installation California" });
    expect(result.requiresReview).toBe(true);
    expect(answer).toMatch(/specialist review/i);
    expect(answer).not.toMatch(/step-by-step|DIY guide|how to wire/i);
  });
});
