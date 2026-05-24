import { planBuiltInAi50000Phase2AndroidRuntimeSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 Android sample planner", () => {
  it("plans 100 Android sample cases with required anchors", () => {
    const sample = planBuiltInAi50000Phase2AndroidRuntimeSample();
    expect(sample).toHaveLength(100);
    expect(sample.map((testCase) => testCase.id)).toContain("phase1_anchor_asphalt_paving_1000sqm");
    expect(sample.map((testCase) => testCase.id)).toContain("phase1_anchor_asphalt_supplier_search_10000sqm");
  });
});
