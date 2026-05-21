import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: window estimate", () => {
  it("does not return director payment data for a window estimate", () => {
    const answer = answerLiveAiForContext({
      context: "director",
      userText: "дай мне смету на установку окон",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.answerTextRu).toContain("окон");
    expect(answer.answerTextRu).toContain("смета");
    expect(answer.answerTextRu).not.toContain("PAY-GKL");
    expect(answer.answerTextRu).not.toContain("платёж");
    expect(answer.answerTextRu).not.toContain("платеж");
  });
});
