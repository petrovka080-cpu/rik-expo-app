import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse no fake stock incoming issue", () => {
  it("does not invent stock incoming issue reserve location eta or waybill data", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "что можно выдать сегодня",
    });

    expect(answer.fakeStockCreated).toBe(false);
    expect(answer.fakeIncomingCreated).toBe(false);
    expect(answer.fakeIssueCreated).toBe(false);
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:stock:MAT-1", "WB-55"]));
    expect(answer.answerRu).not.toMatch(/ETA|выдум|fake/i);
  });
});
