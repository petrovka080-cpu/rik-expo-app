import { listLiveAiRouteDefinitions } from "../../src/lib/ai/liveUi";
import { answerFor } from "./aiLiveUiTestHelpers";

describe("live AI free text uses same pipeline", () => {
  it("routes free text through the live role pipeline registry", () => {
    for (const route of listLiveAiRouteDefinitions()) {
      const answer = answerFor(route.context, "Какие источники проверены, чего не хватает и какой следующий шаг?");
      expect(answer.pipelineKey).toBe(route.pipelineKey);
      expect(answer.providerTrace).toEqual(expect.arrayContaining([route.pipelineKey]));
      expect(answer.answerTextRu).toMatch(/Источники:|Что проверено:/);
    }
  });
});
