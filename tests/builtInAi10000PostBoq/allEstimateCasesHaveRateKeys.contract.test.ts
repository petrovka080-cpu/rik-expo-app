import { BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES } from "../../src/lib/ai/builtInAi10000";

describe("built-in AI 10000 post-BOQ rate keys", () => {
  it("requires estimate cases to carry rate keys", () => {
    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.every((testCase) => testCase.requiredRateKeys.length > 0)).toBe(true);
  });
});
