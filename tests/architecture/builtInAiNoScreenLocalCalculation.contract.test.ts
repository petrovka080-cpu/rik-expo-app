import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no screen local calculation", () => {
  it("keeps screen integration at ingress boundary, not business calculation", () => {
    const screen = readRepoFile("src/features/ai/AIAssistantScreen.tsx");
    const answerPipeline = readRepoFile("src/features/ai/assistantAnswerPipeline.ts");
    expect(screen).toContain("createBuiltInAiAssistantMessage");
    expect(answerPipeline).toContain("answerBuiltInAi");
    expect(screen).not.toContain("calculateGlobalConstructionEstimateSync");
    expect(screen).not.toContain("GLOBAL_RATE_MATERIALS");
  });
});
