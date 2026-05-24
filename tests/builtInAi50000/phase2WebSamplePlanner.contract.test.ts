import { planBuiltInAi50000Phase2WebRuntimeSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 2 web sample planner", () => {
  it("plans 250 web sample cases with required anchors", () => {
    const sample = planBuiltInAi50000Phase2WebRuntimeSample();
    expect(sample).toHaveLength(250);
    expect(sample.map((testCase) => testCase.id)).toContain("phase1_anchor_brick_masonry_74sqm");
    expect(sample.map((testCase) => testCase.id)).toContain("phase1_anchor_rebar_product_search_d14");
  });
});
