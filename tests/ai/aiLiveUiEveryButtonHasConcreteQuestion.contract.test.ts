import { listLiveAiRouteDefinitions } from "../../src/lib/ai/liveUi";
import {
  buttonAnswersFor,
  expectUsefulLiveAnswer,
} from "./aiLiveUiTestHelpers";

describe("live AI every button has concrete question", () => {
  it("maps all visible actions to concrete role questions", () => {
    for (const route of listLiveAiRouteDefinitions()) {
      expect(route.actions.length).toBeGreaterThan(0);
      for (const action of route.actions) {
        expect(action.concreteQuestionRu.length).toBeGreaterThan(40);
        expect(action.pipelineActionId).toBeTruthy();
      }
      for (const answer of buttonAnswersFor(route.context)) {
        expect(answer.actionId).toBeTruthy();
        expect(answer.concreteQuestionRu.length).toBeGreaterThan(40);
        expectUsefulLiveAnswer(answer);
      }
    }
  });
});
