import {
  REQUIRED_LIVE_AI_CONTEXTS,
  allLiveAnswers,
  expectUsefulLiveAnswer,
  routeContexts,
} from "./aiLiveUiTestHelpers";

describe("live AI all screens real answers recovery", () => {
  it("registers every required /ai?context route and returns useful answers", () => {
    expect(routeContexts()).toEqual(REQUIRED_LIVE_AI_CONTEXTS);
    for (const answer of allLiveAnswers()) {
      expectUsefulLiveAnswer(answer);
    }
  });
});
