import { answerMarketplaceIntakeQuestion } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture, marketplaceProductDraft } from "./aiMarketplaceIntake.fixture";

describe("Marketplace no fake price availability", () => {
  it("reports missing price and availability instead of inventing them", () => {
    const answer = answerMarketplaceIntakeQuestion({
      context: buildMarketplaceIntakeFixture({
        offerDrafts: [
          marketplaceProductDraft({
            id: "MP-NO-PRICE",
            price: undefined,
            currency: undefined,
            availability: "unknown",
            missingData: [],
          }),
        ],
        selectedOfferId: "MP-NO-PRICE",
      }),
      questionRu: "проверь карточку товара",
    });
    expect(answer.missingData).toEqual(expect.arrayContaining(["цена", "валюта", "наличие"]));
    expect(answer.fakePriceCreated).toBe(false);
    expect(answer.fakeAvailabilityCreated).toBe(false);
    expect(answer.answerRu).toContain("цена");
  });
});
