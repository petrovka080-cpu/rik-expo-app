import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse stock summary", () => {
  it("includes source-backed materials, quantities and risks", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "warehouse today",
    });

    expect(answer.stockSummary.totalItems).toBe(1);
    expect(answer.stockSummary.availableQty).toBe(8);
    expect(answer.events.some((event) => event.materialNameRu === "Concrete M300")).toBe(true);
    expect(answer.risks.length).toBeGreaterThan(0);
    expect(answer.sources.some((source) => source.type === "warehouse_stock")).toBe(true);
  });
});
