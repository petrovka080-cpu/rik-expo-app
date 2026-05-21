import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: door estimate", () => {
  it("does not return the foreman workday GKL summary for a door estimate", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("двер");
    expect(answer.answerTextRu).toContain("смета");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
    expect(answer.answerTextRu).not.toContain("ГКЛ");
  });
});
