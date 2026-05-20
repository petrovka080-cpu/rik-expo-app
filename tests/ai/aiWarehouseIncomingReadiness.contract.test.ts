import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse incoming readiness", () => {
  it("checks incoming documents without accepting stock", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "check incoming documents",
    });

    expect(answer.intent).toBe("incoming_review");
    expect(answer.providerTrace).toContain("aiWaybillProvider");
    expect(answer.events.some((event) => event.eventType === "incoming_check")).toBe(true);
    expect(answer.incomingAccepted).toBe(false);
    expect(answer.stockMutated).toBe(false);
  });
});
