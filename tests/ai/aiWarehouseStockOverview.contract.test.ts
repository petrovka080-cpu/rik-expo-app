import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse stock overview", () => {
  it("returns source-backed material stock, reserve and deficit context", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "что есть на складе",
    });

    expect(answer.intent).toBe("stock_overview");
    expect(answer.totals?.stockItems).toBe(1);
    expect(answer.sources.some((source) => source.type === "stock_item")).toBe(true);
    expect(answer.answerRu).toContain("Concrete M300");
    expect(answer.answerRu).toContain("Зарезервировано");
    expect(answer.stockMutated).toBe(false);
  });
});
