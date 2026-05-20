import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse transfers", () => {
  it("reviews transfer route without moving stock", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "проверь перемещение",
    });

    expect(answer.intent).toBe("transfer_readiness");
    expect(answer.events.some((event) =>
      event.eventType === "transfer_check" &&
      event.linkedContext.transferId === "TR-9",
    )).toBe(true);
    expect(answer.transferCompleted).toBe(false);
    expect(answer.stockMutated).toBe(false);
  });
});
