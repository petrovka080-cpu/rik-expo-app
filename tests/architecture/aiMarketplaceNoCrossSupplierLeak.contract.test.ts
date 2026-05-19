import { answerMarketplaceIntakeQuestion } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "../ai/aiMarketplaceIntake.fixture";

describe("Marketplace architecture no cross supplier leak", () => {
  it("filters private offers owned by other suppliers", () => {
    const answer = answerMarketplaceIntakeQuestion({
      context: buildMarketplaceIntakeFixture(),
      questionRu: "проверить карточки",
    });
    expect(answer.visibleOffers.some((offer) => offer.id === "MP-OTHER-PRIVATE")).toBe(false);
    expect(answer.crossSupplierPrivateLeakFound).toBe(false);
    expect(answer.answerRu).not.toContain("Другой поставщик");
  });
});
