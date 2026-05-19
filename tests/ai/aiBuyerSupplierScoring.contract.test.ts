import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer supplier scoring", () => {
  it("scores offers with explainable reasons and warnings", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "сравни поставщиков",
    });

    expect(answer.scores.length).toBe(answer.offers.length);
    expect(answer.scores[0].totalScore).toBeGreaterThan(0);
    expect(answer.scores[0].reasonsRu.length).toBeGreaterThan(0);
    expect(answer.shortlist).toHaveLength(3);
    expect(answer.shortlist[0].checksBeforeApprovalRu).toContain("подтвердить документы поставщика перед заказом");
  });
});
