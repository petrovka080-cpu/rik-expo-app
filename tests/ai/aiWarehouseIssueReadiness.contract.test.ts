import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse issue readiness", () => {
  it("checks object/work linked issue without issuing material", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "what can be issued by object",
    });

    expect(answer.intent).toBe("what_to_issue_by_object");
    expect(answer.events.some((event) => event.eventType === "approval_item")).toBe(true);
    expect(answer.issueExecuted).toBe(false);
    expect(answer.reservationCreated).toBe(false);
  });
});
