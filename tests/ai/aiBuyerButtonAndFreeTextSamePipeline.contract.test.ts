import { answerBuyerAction, answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer buttons and free text use same pipeline", () => {
  it("routes action buttons and free text through buyerSourcingPipeline", () => {
    const context = buildBuyerRealSourcingFixture();
    const freeText = answerBuyerSourcingQuestion({
      context,
      questionRu: "найди 10 вариантов по этой заявке",
    });
    const button = answerBuyerAction({
      context,
      actionId: "find_5_10_suppliers",
    });

    expect(freeText.providerTrace[0]).toBe("buyerSourcingPipeline");
    expect(button.providerTrace[0]).toBe("buyerSourcingPipeline");
    expect(button.offers.map((offer) => offer.id)).toEqual(freeText.offers.map((offer) => offer.id));
  });
});
