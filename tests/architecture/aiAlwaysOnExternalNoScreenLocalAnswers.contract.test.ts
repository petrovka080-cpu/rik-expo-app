import {
  readAiAlwaysOnExternalSources,
  readAssistantAnswerPipelineSource,
  readAssistantScreenSource,
} from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no screen local answers", () => {
  it("keeps estimate copy in shared AI modules, not in the route screen", () => {
    const screen = readAssistantScreenSource();
    const answerPipeline = readAssistantAnswerPipelineSource();

    expect(screen).toContain("createExternalKnowledgeAssistantMessage");
    expect(answerPipeline).toContain("answerAlwaysOnExternalKnowledgeQuestion");
    expect(screen).not.toContain("Паркет / ламинат");
    expect(readAiAlwaysOnExternalSources()).toContain("composeConstructionEstimateAnswerRu");
  });
});
