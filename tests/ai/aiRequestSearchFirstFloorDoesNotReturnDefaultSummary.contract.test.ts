import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: first-floor requests", () => {
  it("returns procurement request search or checked-empty reason instead of foreman default summary", () => {
    const answer = answerLiveAiForContext({
      context: "foreman",
      userText: "выдай мне заявки все по первому этажу",
    });

    expect(answer.queryIntent).toBe("procurement_request_search");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toMatch(/заявк/i);
    expect(answer.answerTextRu).toMatch(/перв|1 этаж|этаж/i);
    expect(answer.answerTextRu).toMatch(/Что проверено:|Источники:/i);
    expect(answer.answerTextRu).toMatch(/Следующий шаг:/i);
    expect(answer.answerTextRu).not.toMatch(/монтаж перегородок|фото после выполнения|акт не подготовлен|PAY-GKL/i);
  });
});
