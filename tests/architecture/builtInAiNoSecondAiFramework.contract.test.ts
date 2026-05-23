import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no second AI framework", () => {
  it("orchestrates existing domain tools without adding another model framework", () => {
    const source = readRepoFile("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
    expect(source).toContain("calculateGlobalConstructionEstimateSync");
    expect(source).not.toMatch(/new\s+AiModelGateway|generate\(|chatCompletion|openai|gemini/i);
  });
});
