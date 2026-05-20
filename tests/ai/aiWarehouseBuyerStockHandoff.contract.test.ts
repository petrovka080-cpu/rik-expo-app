import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse buyer stock handoff", () => {
  it("passes real stock and deficit context to buyer without creating purchase request", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "передать дефицит снабженцу",
    });

    expect(answer.intent).toBe("warehouse_to_procurement_link");
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiProcurementLinkedRequestProvider",
      "aiSupplierLinkedOfferProvider",
      "aiMarketplaceLinkedOfferProvider",
    ]));
    expect(answer.nextStepRu).toContain("снабженцу");
    expect(answer.changedData).toBe(false);
    expect(answer.stockMutated).toBe(false);
  });
});
