import { evaluateAiEstimateRateLimit } from "../../src/lib/ai/cost";

describe("product search rate limit", () => {
  it("blocks product search loops above limit", () => {
    expect(evaluateAiEstimateRateLimit({ key: "product_search", count: 101, limit: 100 }).allowed).toBe(false);
  });
});
