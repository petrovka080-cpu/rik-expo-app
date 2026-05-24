import {
  calculateGlobalConstructionEstimateSync,
  minimumRowsForEstimate,
  validateEstimateBoqDepth,
  validateEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";

describe("professional BOQ depth policy", () => {
  it("treats foundation as a complex BOQ with materials, labor and delivery/equipment", () => {
    const result = calculateGlobalConstructionEstimateSync({
      text: "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const depth = validateEstimateBoqDepth(result);
    const formula = validateEstimateFormulaQuality(result);

    expect(minimumRowsForEstimate(result)).toBe(12);
    expect(depth).toMatchObject({
      passed: true,
      minimumRows: 12,
      actualRows: 20,
      hasMaterials: true,
      hasLabor: true,
      hasEquipmentOrDeliveryOrWarning: true,
    });
    expect(formula.passed).toBe(true);
  });
});
