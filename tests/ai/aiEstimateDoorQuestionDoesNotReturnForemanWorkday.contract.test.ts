import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: door estimate", () => {
  it("does not answer a door estimate question with foreman GKL workday summary", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "дай мне смету на установку дверей",
    });

    expect(answer.queryIntent).toBe("construction_estimate_request");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toMatch(/смет/i);
    expect(answer.answerTextRu).toMatch(/двер/i);
    expect(answer.answerTextRu).toMatch(/монтаж|установ/i);
    expect(answer.answerTextRu).not.toMatch(/ГКЛ|монтаж перегородок|фото после выполнения|акт не подготовлен|PAY-GKL/i);
    expect(answer.changedData).toBe(false);
    expect(answer.dangerousMutationsFound).toBe(0);
  });
});
