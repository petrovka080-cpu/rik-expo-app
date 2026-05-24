import {
  planBuiltInAi50000Phase1AndroidLiveSample,
  planBuiltInAi50000Phase1WebLiveSample,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 1 live sample planner", () => {
  it("plans 125 web cases and 50 Android cases", () => {
    expect(planBuiltInAi50000Phase1WebLiveSample()).toHaveLength(125);
    expect(planBuiltInAi50000Phase1AndroidLiveSample()).toHaveLength(50);
  });
});
