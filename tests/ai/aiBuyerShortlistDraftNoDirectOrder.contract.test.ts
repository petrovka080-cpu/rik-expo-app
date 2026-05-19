import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer shortlist draft no direct order", () => {
  it("prepares shortlist as draft without creating order", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "подготовь shortlist директору",
    });

    expect(answer.answerKind).toBe("shortlist_draft");
    expect(answer.shortlist).toHaveLength(3);
    expect(answer.orderCreated).toBe(false);
    expect(answer.paymentCreated).toBe(false);
    expect(answer.directOrderPathUsed).toBe(false);
    expect(answer.answerRu).toContain("Заказ не создан");
  });
});
