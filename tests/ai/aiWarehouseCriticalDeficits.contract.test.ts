import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse critical deficits", () => {
  it("shows material deficit with work object request and source trace", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "что критично и что нужно докупить",
    });

    expect(answer.intent).toBe("critical_deficits");
    expect(answer.events.some((event) =>
      event.eventType === "material_blocker" &&
      event.linkedContext.workId === "WRK-300" &&
      event.linkedContext.objectId === "OBJ-12" &&
      (event.quantity.deficit ?? 0) > 0,
    )).toBe(true);
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:stock:MAT-1", "src:request:MR-300"]));
    expect(answer.fakeStockCreated).toBe(false);
  });
});
