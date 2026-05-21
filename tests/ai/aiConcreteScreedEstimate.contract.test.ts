import { answerLiveAiForContext, classifyConstructionWorkType } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: concrete screed estimate", () => {
  it("returns a concrete screed estimate draft instead of a screen fallback", () => {
    const question = "дай мне смету на бетонную стяжку 50 м2";
    const answer = answerLiveAiForContext({ context: "foreman", userText: question });

    expect(classifyConstructionWorkType(question)).toBe("concrete_screed");
    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("стяж");
    expect(answer.answerTextRu).toContain("50");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
  });
});
