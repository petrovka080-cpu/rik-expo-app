import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse reservations", () => {
  it("reports reservations and prevents reserve release by AI", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "что зарезервировано",
    });

    expect(answer.intent).toBe("reservation_check");
    expect(answer.events.some((event) =>
      event.eventType === "reservation_check" &&
      event.linkedContext.reservationId === "RSV-17" &&
      event.quantity.reserved === 10,
    )).toBe(true);
    expect(answer.reservationCreated).toBe(false);
    expect(answer.autoApproval).toBe(false);
  });
});
