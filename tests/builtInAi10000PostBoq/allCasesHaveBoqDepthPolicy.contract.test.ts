import { BUILT_IN_AI_10000_POST_BOQ_CASES } from "../../src/lib/ai/builtInAi10000";

describe("built-in AI 10000 post-BOQ depth policy", () => {
  it("declares a BOQ depth policy for every case", () => {
    expect(BUILT_IN_AI_10000_POST_BOQ_CASES.every((testCase) => testCase.boqDepthPolicyKey.length > 0)).toBe(true);
  });
});
