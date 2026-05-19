import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse no fake stock data", () => {
  it("does not invent stock, incoming, issues or documents", () => {
    const answer = answerWarehouseStockQuestion({
      context: {
        ...buildWarehouseRealStockFixture(),
        stockItems: [],
        incoming: [],
        issues: [],
      },
      questionRu: "warehouse today",
    });

    expect(answer.answerKind).toBe("exact_no_data_reason");
    expect(answer.fakeStockCreated).toBe(false);
    expect(answer.fakeIncomingCreated).toBe(false);
    expect(answer.fakeIssueCreated).toBe(false);
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.answerRu).toContain("No source-backed material rows found.");
  });
});
