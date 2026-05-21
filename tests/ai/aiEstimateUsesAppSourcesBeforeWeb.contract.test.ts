import { answerLiveAiForContext, type LiveAiQueryIntentSources } from "../../src/lib/ai/liveUi";
import { CONNECTED_WEB_SOURCES } from "./aiExternalWebFallbackTestHelpers";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: app sources before web", () => {
  it("uses a project estimate source before external web", () => {
    const sources: LiveAiQueryIntentSources = {
      ...CONNECTED_WEB_SOURCES,
      projectEstimates: [
        {
          id: "EST-ASPHALT-100",
          labelRu: "Проектная смета: укладка асфальта 100 м²",
          lines: [
            {
              textRu: "Укладка асфальта 100 м² по проектной смете.",
              sourceRefs: ["estimate:EST-ASPHALT-100:line-1"],
            },
          ],
          sourcesRu: ["estimate EST-ASPHALT-100"],
        },
      ],
    };
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай смету на укладку асфальта 100 м2",
      intentSources: sources,
    });

    expect(answer.answerTextRu).toContain("EST-ASPHALT-100");
    expect(answer.sourceProvenance.some((source) => source.origin === "app_data" && source.canBePresentedAsFact)).toBe(true);
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web")).toBe(false);
    expect(answer.providerTrace).toContain("projectEstimateProvider");
  });
});
