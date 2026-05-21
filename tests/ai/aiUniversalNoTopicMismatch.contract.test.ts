import { answerLiveAiForContext, evaluateUniversalSemanticGuard } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: no topic mismatch", () => {
  it("semantic guard catches and prevents explicit-question mismatch", () => {
    const questionRu = "дай смету на заливку монолита на 1200 кв метров";
    const answer = answerLiveAiForContext({ context: "foreman", userText: questionRu });

    expect(evaluateUniversalSemanticGuard({
      questionRu,
      answer,
      expectedIntent: "construction_estimate",
      expectedEntity: "construction_work_type",
    })).toMatchObject({ passed: true });
    expect(answer.answerTextRu).not.toContain("ГКЛ");
  });
});
