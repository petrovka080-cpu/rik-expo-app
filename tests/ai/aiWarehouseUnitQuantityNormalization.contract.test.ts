import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse unit quantity normalization", () => {
  it("requires normalization trace for quantity comparison", () => {
    const context = buildWarehouseRealStockFixture();
    const answer = answerWarehouseStockQuestion({
      context,
      questionRu: "сверь со сметой и единицами",
    });

    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiUnitConversionProvider",
      "aiPackageConversionProvider",
      "aiQuantityNormalizationProvider",
    ]));
    expect(answer.events.some((event) => event.quantity.unit === "m3")).toBe(true);
    expect(answer.fakeStockCreated).toBe(false);
  });
});
