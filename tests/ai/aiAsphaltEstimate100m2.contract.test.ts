import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: asphalt estimate", () => {
  it("answers asphalt estimate questions with asphalt, quantity and draft status", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на укладку асфальта на площади 100 кв метров",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("асфальт");
    expect(answer.answerTextRu).toContain("100");
    expect(answer.answerTextRu).toContain("м²");
    expect(answer.answerTextRu).toContain("основан");
    expect(answer.answerTextRu).toContain("уплотнение");
    expect(answer.answerTextRu).not.toContain("ГКЛ");
    expect(answer.answerTextRu).not.toContain("монтаж перегородок");
    expect(answer.answerTextRu).not.toContain("PAY-GKL");
    expect(answer.status).toBe("draft_prepared");
    expect(answer.changedData).toBe(false);
  });
});
