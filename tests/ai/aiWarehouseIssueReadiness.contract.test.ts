import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse issue readiness", () => {
  it("checks object/work linked issue without issuing material", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "what can be issued by object",
    });

    expect(answer.intent).toBe("issue_readiness");
    expect(answer.events.some((event) => event.eventType === "issue_readiness")).toBe(true);
    expect(answer.events.some((event) => event.quantity.reserved === 10 && event.quantity.available === 8)).toBe(true);
    expect(answer.issueExecuted).toBe(false);
    expect(answer.reservationCreated).toBe(false);
  });
});
