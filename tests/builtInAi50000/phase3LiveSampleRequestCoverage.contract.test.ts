import { planBuiltInAi50000Phase3RequestDraftSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 request draft coverage", () => {
  it("selects 100 structured request draft cases", () => {
    const sample = planBuiltInAi50000Phase3RequestDraftSample();
    expect(sample).toHaveLength(100);
    expect(sample.every((item) => item.route === "/request" && item.expectedTool === "calculate_global_estimate")).toBe(true);
  });
});
