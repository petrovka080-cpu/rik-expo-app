import { answerLiveAiForContext, classifyConstructionWorkType } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: electrical estimate", () => {
  it("recognizes electrical estimate questions", () => {
    const question = "дай смету на электрику";
    const answer = answerLiveAiForContext({ context: "director", userText: question });

    expect(classifyConstructionWorkType(question)).toBe("electrical");
    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("электр");
    expect(answer.answerTextRu).toContain("смета");
  });
});
