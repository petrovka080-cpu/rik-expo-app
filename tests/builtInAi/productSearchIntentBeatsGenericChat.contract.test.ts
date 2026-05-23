import { BUILT_IN_AI_PROMPTS, expectBuiltInProductSearch } from "./builtInAiTestHelpers";

describe("built-in AI product search intent beats generic chat", () => {
  it("routes material search to product tool with no fake stock", () => {
    const answer = expectBuiltInProductSearch(BUILT_IN_AI_PROMPTS.tileProduct);
    expect(answer.toolResult.toolName).toBe("search_material_products");
  });
});
