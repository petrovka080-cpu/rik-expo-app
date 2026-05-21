import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("universal accountant invoice count live answer", () => {
  it("answers count questions from the accountant screen instead of returning one invoice detail", () => {
    const answer = answerLiveAiForContext({
      context: "accountant",
      userText: "сколько счетов для оплаты есть у меня",
    });

    expect(answer.queryIntent).toBe("app_data_count");
    expect(answer.explicitUserIntentUsed).toBe(true);
    expect(answer.answerTextRu).toContain("Счета к оплате/проверке: 1");
    expect(answer.answerTextRu).toContain("Готовы к оплате без блокеров: 0");
    expect(answer.answerTextRu).toContain("Кыргызстан");
    expect(answer.answerTextRu).toContain("KGS");
    expect(answer.answerTextRu).toContain("Интернет: не использовался");
    expect(answer.answerTextRu).toContain("Данные не изменены");
    expect(answer.answerTextRu).not.toContain("needs_check");
    expect(answer.answerTextRu).not.toContain("платеж не создан, источники проверены");
    expect(answer.sourceProvenance.some((source) => source.origin === "public_web" && source.canBePresentedAsFact)).toBe(false);
    expect(answer.providerTrace).toContain("accountantInvoiceCount");
  });
});
