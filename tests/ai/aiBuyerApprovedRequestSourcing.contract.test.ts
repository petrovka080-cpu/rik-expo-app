import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer approved request sourcing", () => {
  it("turns an approved request into a sourcing result or exact reason", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "подбери поставщиков по этой заявке",
    });

    expect(answer.requestSummary.approved).toBe(true);
    expect(answer.requestSummary.objectRu).toBe("Дом 1, 2 этаж");
    expect(answer.requestSummary.workRu).toBe("Монтаж перегородок");
    expect(answer.answerKind).toBe("sourcing_result");
    expect(answer.answerRu).toContain("MR-1042");
    expect(answer.answerRu).toContain("ГКЛ 12.5 мм");
  });
});
