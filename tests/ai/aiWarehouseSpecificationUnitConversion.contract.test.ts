import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse specification and unit conversion", () => {
  it("uses specification provider and refuses unsourced unit conversion facts", () => {
    const context = buildWarehouseRealStockFixture();
    const specAnswer = answerWarehouseStockQuestion({ context, questionRu: "check specification" });
    const unitAnswer = answerWarehouseStockQuestion({
      context: { ...context, unitConversionConfigured: false },
      questionRu: "check units",
    });

    expect(specAnswer.providerTrace).toContain("aiMaterialSpecificationProvider");
    expect(specAnswer.sourceTrace).toContain("src:spec:DOC-17");
    expect(unitAnswer.providerTrace).toContain("aiUnitConversionProvider");
    expect(unitAnswer.missingData).toContain("Unit conversion factor/source is missing.");
  });
});
