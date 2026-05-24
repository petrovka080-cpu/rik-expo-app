import { planBuiltInAi50000Phase3ProductSearchSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 product coverage", () => {
  it("selects 100 product search cases with product policies", () => {
    const sample = planBuiltInAi50000Phase3ProductSearchSample();
    expect(sample).toHaveLength(100);
    expect(sample.every((item) => item.route === "/product/search" && item.intent === "product_search")).toBe(true);
  });
});
