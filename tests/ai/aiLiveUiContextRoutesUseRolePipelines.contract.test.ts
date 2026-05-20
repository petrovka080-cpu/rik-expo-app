import { listLiveAiRouteDefinitions } from "../../src/lib/ai/liveUi";
import {
  REQUIRED_PIPELINES,
  answerFor,
} from "./aiLiveUiTestHelpers";

describe("live AI context routes use role pipelines", () => {
  it("maps each live context to its intended pipeline key", () => {
    for (const route of listLiveAiRouteDefinitions()) {
      expect(route.pipelineKey).toBe(REQUIRED_PIPELINES[route.context]);
      const answer = answerFor(route.context, route.defaultQuestionRu);
      expect(answer.pipelineKey).toBe(route.pipelineKey);
      expect(answer.providerTrace).toEqual(expect.arrayContaining([route.pipelineKey]));
    }
  });
});
