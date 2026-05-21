import {
  readAiAlwaysOnExternalSources,
  readAssistantScreenSource,
} from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no screen local answers", () => {
  it("keeps estimate copy in shared AI modules, not in the route screen", () => {
    const screen = readAssistantScreenSource();

    expect(screen).toContain("answerAlwaysOnExternalKnowledgeQuestion");
    expect(screen).not.toContain("Паркет / ламинат");
    expect(readAiAlwaysOnExternalSources()).toContain("composeConstructionEstimateAnswerRu");
  });
});
