import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse inventory discrepancy", () => {
  it("surfaces counted-vs-book mismatch without writeoff", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "где расхождения по инвентаризации",
    });

    expect(answer.intent).toBe("inventory_discrepancy_check");
    expect(answer.events.some((event) =>
      event.eventType === "inventory_discrepancy" &&
      event.blockers.some((blocker) => blocker.kind === "inventory_mismatch"),
    )).toBe(true);
    expect(answer.writeoffCompleted).toBe(false);
    expect(answer.stockMutated).toBe(false);
  });
});
