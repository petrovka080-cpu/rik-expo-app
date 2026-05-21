import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no second AI framework", () => {
  it("does not introduce model providers or a parallel AI runtime", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/@openai\/|openai\.chat|Gemini|AiModelGateway|LegacyGeminiModelProvider|modelProvider\s*=/i);
    expect(source).not.toMatch(/streamText|generateText|chat\.completions/i);
  });
});
