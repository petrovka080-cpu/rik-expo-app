import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no second AI framework", () => {
  it("does not introduce another AI SDK/framework for this binding fix", () => {
    const packageJson = readRepoFile("package.json");
    const source = [
      readRepoFile("src/features/consumerRepair/consumerRepairAiAdapter.ts"),
      readRepoFile("src/features/ai/assistantAnswerPipeline.ts"),
      readRepoFile("src/lib/ai/estimatePresentation/buildEstimatePresentationViewModel.ts"),
    ].join("\n");
    expect(packageJson).not.toMatch(/"langchain"|"@langchain\/| "@ai-sdk\/openai"| "openai"/);
    expect(source).not.toMatch(/from ["'](?:openai|langchain|@langchain\/|@ai-sdk\/)/);
  });
});
