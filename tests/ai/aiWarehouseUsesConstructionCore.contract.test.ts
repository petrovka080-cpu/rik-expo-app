import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse uses construction core links", () => {
  it("keeps material linked to work, object, specification and request sources", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "check specification and what blocks work",
    });

    expect(answer.sourceTrace).toEqual(expect.arrayContaining([
      "src:spec:DOC-17",
      "src:work:WRK-300",
      "src:object:OBJ-12",
      "src:request:MR-300",
    ]));
    expect(answer.events.some((event) =>
      event.materialId === "MAT-1" && event.workId === "WRK-300" && event.objectId === "OBJ-12",
    )).toBe(true);
  });
});
