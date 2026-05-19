import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse no cross-role finance security leak", () => {
  it("hides payment, runtime and raw provider data from warehouse answer", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "warehouse today",
    });

    expect(answer.hiddenByPermission.some((item) => item.sourceType === "payment")).toBe(true);
    expect(answer.sources.some((source) => source.id === "src:payment:hidden")).toBe(false);
    expect(answer.answerRu).not.toMatch(/full cashflow|runtime secret|provider payload|service_role/i);
  });
});
