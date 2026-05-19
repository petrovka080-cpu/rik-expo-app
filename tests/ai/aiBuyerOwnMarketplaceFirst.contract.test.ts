import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer own marketplace first", () => {
  it("checks warehouse and own marketplace before external sources", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "найди 10 вариантов",
    });

    const priority = answer.providerTrace.find((item) => item.startsWith("source_priority:"));
    expect(priority).toBe("source_priority:warehouse>own_marketplace>approved_vendors>supplier_history>supplier_offers>external_marketplaces>internet");
    expect(answer.offers[0].sourceType).toBe("own_marketplace");
    expect(answer.providerTrace.indexOf("aiWarehouseLinkedStockProvider")).toBeLessThan(answer.providerTrace.indexOf("aiMarketplaceCatalogProvider"));
    expect(answer.providerTrace.indexOf("aiMarketplaceCatalogProvider")).toBeLessThan(answer.providerTrace.indexOf("aiExternalMarketplaceProvider"));
  });
});
