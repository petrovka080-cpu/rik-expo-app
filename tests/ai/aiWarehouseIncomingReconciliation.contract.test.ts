import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse incoming reconciliation", () => {
  it("reconciles request waybill and actual incoming without accepting stock", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "сверить приход с накладной",
    });

    expect(answer.intent).toBe("incoming_waybill_reconciliation");
    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiWarehouseIncomingProvider",
      "aiWaybillProvider",
      "aiProcurementLinkedRequestProvider",
    ]));
    expect(answer.events.some((event) =>
      event.eventType === "incoming_check" &&
      event.blockers.some((blocker) => blocker.kind === "quantity_mismatch"),
    )).toBe(true);
    expect(answer.sourceTrace).toContain("WB-55");
    expect(answer.incomingAccepted).toBe(false);
  });
});
