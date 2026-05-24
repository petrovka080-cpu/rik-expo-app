import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest prompt uniqueness", () => {
  it("has no duplicate prompts without variant metadata", () => {
    const prompts = fullCases.map((testCase) => testCase.promptRu);
    expect(new Set(prompts).size).toBe(prompts.length);
  });
});
