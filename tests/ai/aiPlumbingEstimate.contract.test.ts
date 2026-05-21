import { answerLiveAiForContext, classifyConstructionWorkType } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: plumbing estimate", () => {
  it("recognizes plumbing estimate questions", () => {
    const question = "дай смету на сантехнику";
    const answer = answerLiveAiForContext({ context: "foreman", userText: question });

    expect(classifyConstructionWorkType(question)).toBe("plumbing");
    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("сантех");
    expect(answer.answerTextRu).toContain("смета");
  });
});
