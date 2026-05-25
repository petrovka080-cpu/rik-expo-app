import { BUILT_IN_AI_10000_POST_BOQ_CASES } from "../../src/lib/ai/builtInAi10000";

describe("built-in AI 10000 post-BOQ ids", () => {
  it("has no duplicate ids", () => {
    const ids = BUILT_IN_AI_10000_POST_BOQ_CASES.map((testCase) => testCase.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
