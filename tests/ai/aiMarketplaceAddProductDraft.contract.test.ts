import { answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Marketplace add product draft", () => {
  it("returns a product draft result with missing data and no publish/order", () => {
    const answer = answerMarketplaceIntakeAction({
      context: buildMarketplaceIntakeFixture(),
      actionId: "add_product_draft",
    });
    expect(answer.answerKind).toBe("offer_draft");
    expect(answer.draft?.offerType).toBe("product");
    expect(answer.draft?.published).toBe(false);
    expect(answer.missingData).toContain("сертификат соответствия");
    expect(answer.published).toBe(false);
    expect(answer.orderCreated).toBe(false);
    expect(answer.directPublishPathUsed).toBe(false);
  });
});
