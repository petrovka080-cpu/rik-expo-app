import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer free text questions", () => {
  it.each([
    "найди 10 вариантов по этой заявке",
    "проверь склад перед закупкой",
    "найди аналоги дешевле",
    "сравни поставщиков по цене и сроку",
    "подготовь shortlist директору",
    "что нужно уточнить перед заказом",
  ])("answers %s through the sourcing pipeline", (questionRu) => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu,
    });

    expect(answer.providerTrace).toContain("buyerSourcingPipeline");
    expect(answer.genericAnswerUsed).toBe(false);
    expect(answer.answerRu).toContain("Заявка:");
    expect(answer.answerRu).toContain("Предложения:");
    expect(answer.answerRu).toContain("Следующий шаг:");
  });
});
