import { answerBuyerSourcingQuestion } from "../../src/lib/ai/buyerSourcing";
import { buildBuyerRealSourcingFixture } from "./aiBuyerRealSourcing.fixture";

describe("Buyer warehouse before buy", () => {
  it("checks linked stock before recommending sourcing", () => {
    const answer = answerBuyerSourcingQuestion({
      context: buildBuyerRealSourcingFixture(),
      questionRu: "проверь склад перед закупкой",
    });

    expect(answer.stockCheck.checked).toBe(true);
    expect(answer.stockCheck.availableQty).toBe(18);
    expect(answer.stockCheck.deficitQty).toBe(24);
    expect(answer.providerTrace.indexOf("aiWarehouseLinkedStockProvider")).toBeLessThan(answer.providerTrace.indexOf("aiMarketplaceCatalogProvider"));
  });
});
