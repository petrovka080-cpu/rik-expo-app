import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no second AI framework", () => {
  it("uses existing BuiltInAi/global estimate path without adding a second AI framework", () => {
    const source = readRequestEstimateRuntimeSource();
    expect(source).toContain("answerBuiltInAi");
    expect(source).not.toMatch(/new\s+AIFramework|SecondAi|OpenAIClient|Anthropic|LangChain|llamaindex/i);
  });
});
