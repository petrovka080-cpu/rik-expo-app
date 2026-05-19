import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse material blockers", () => {
  it("links material deficit to work/object and procurement handoff", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "what material blocks work today",
    });

    expect(answer.intent).toBe("material_blockers");
    expect(answer.events.some((event) => event.workId === "WRK-300" && event.objectId === "OBJ-12")).toBe(true);
    expect(answer.providerTrace).toContain("aiProcurementLinkedRequestProvider");
    expect(answer.nextStepRu).toContain("Review source-backed stock");
  });
});
