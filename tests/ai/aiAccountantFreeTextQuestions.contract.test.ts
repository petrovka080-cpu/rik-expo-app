import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant free text questions", () => {
  it.each([
    "почему этот счёт можно или нельзя оплачивать",
    "с чем связан акт",
    "покажи движение денег по объекту",
    "какие документы нужны для оплаты",
    "подготовь rationale директору",
    "проверь план счетов",
  ])("routes '%s' through the accountant finance pipeline", (questionRu) => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu,
    });

    expect(answer.providerTrace[0]).toBe("accountantFinancePipeline");
    expect(answer.answerRu).toContain("Источники:");
    expect(answer.answerRu).toContain("Следующий шаг:");
    expect(answer.genericAnswerUsed).toBe(false);
  });
});
