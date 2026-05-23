import { BUILT_IN_AI_PROMPTS, expectBuiltInProductSearch } from "./builtInAiTestHelpers";

describe("built-in AI product search no fake stock", () => {
  it("returns source-backed product rows without claiming availability", () => {
    const answer = expectBuiltInProductSearch(BUILT_IN_AI_PROMPTS.laminateProduct);
    expect(answer.toolResult.productSearch?.candidates.every((candidate) => candidate.stockKnown === false)).toBe(true);
  });
});
