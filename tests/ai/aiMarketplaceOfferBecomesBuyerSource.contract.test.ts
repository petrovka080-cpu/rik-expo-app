import { marketplaceDraftToBuyerSourcingOffer } from "../../src/lib/ai/marketplaceIntake";
import { approvedMarketplaceOffer, buildMarketplaceIntakeFixture, marketplaceProductDraft } from "./aiMarketplaceIntake.fixture";

describe("Marketplace offer becomes buyer source", () => {
  it("adapts only approved marketplace offers into own_marketplace buyer sourcing source", () => {
    const context = buildMarketplaceIntakeFixture();
    const approved = marketplaceDraftToBuyerSourcingOffer(approvedMarketplaceOffer(), {
      request: context.buyerRequests[0],
      checkedAt: context.checkedAt,
    });
    const draft = marketplaceDraftToBuyerSourcingOffer(marketplaceProductDraft(), {
      request: context.buyerRequests[0],
      checkedAt: context.checkedAt,
    });
    expect(approved?.sourceType).toBe("own_marketplace");
    expect(approved?.supplierNameRu).toContain("СтройМаркет");
    expect(approved?.price).toBe(125);
    expect(approved?.availability).toBe("limited");
    expect(approved?.sourceLabelRu).toContain("наш marketplace");
    expect(draft).toBeNull();
  });
});
