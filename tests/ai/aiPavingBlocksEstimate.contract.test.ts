import { answerLiveAiForContext, classifyConstructionWorkType } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: paving blocks estimate", () => {
  it("routes paving block estimates through the construction estimate engine", () => {
    const question = "дай смету на укладку брусчатки 50 квадратов";
    const answer = answerLiveAiForContext({ context: "foreman", userText: question });

    expect(classifyConstructionWorkType(question)).toBe("paving_blocks");
    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("брусчат");
    expect(answer.answerTextRu).toContain("50");
  });
});
