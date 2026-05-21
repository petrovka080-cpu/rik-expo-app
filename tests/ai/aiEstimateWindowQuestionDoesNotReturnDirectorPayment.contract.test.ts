import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: window estimate", () => {
  it("does not answer a window estimate question with director payment summary", () => {
    const answer = answerLiveAiForContext({
      context: "director",
      userText: "дай мне смету на установку окон",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toMatch(/смет/i);
    expect(answer.answerTextRu).toMatch(/окн|окон|ПВХ/i);
    expect(answer.answerTextRu).toMatch(/монтаж|установ/i);
    expect(answer.answerTextRu).not.toMatch(/PAY-GKL|Плат[её]ж|INV-GKL|главное решение|approval summary/i);
  });
});
