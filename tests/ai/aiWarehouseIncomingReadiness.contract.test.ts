import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse incoming readiness", () => {
  it("checks incoming documents without accepting stock", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "check incoming documents",
    });

    expect(answer.intent).toBe("incoming_readiness");
    expect(answer.missingData).toEqual(expect.arrayContaining(["Incoming INC-55 has no source document/certificate/waybill."]));
    expect(answer.incomingAccepted).toBe(false);
    expect(answer.stockMutated).toBe(false);
  });
});
