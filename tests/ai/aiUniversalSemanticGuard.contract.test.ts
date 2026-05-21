import { answerLiveAiForContext, evaluateUniversalSemanticGuard } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: semantic guard", () => {
  it("passes when the answer matches the explicit app-data question", () => {
    const questionRu = "сколько заявок было за месяц май";
    const answer = answerLiveAiForContext({ context: "foreman", userText: questionRu });

    expect(evaluateUniversalSemanticGuard({
      questionRu,
      answer,
      expectedIntent: "app_data_count",
      expectedEntity: "procurement_request",
    })).toMatchObject({ passed: true });
  });
});
