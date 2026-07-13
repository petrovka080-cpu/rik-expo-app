import { MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES } from "../../scripts/estimate/materialQuantityCriticalCases";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { validateProfessionalMaterialQuantityAccuracy } from "../../src/lib/estimate/validateProfessionalMaterialQuantityAccuracy";

describe("material quantity static noise guard", () => {
  it("does not use static same-quantity material rows across critical runtime cases", () => {
    for (const testCase of MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES.slice(0, 20)) {
      const revision = createEstimateDraftRevision({
        rawInput: testCase.prompt,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        createdAt: "2026-07-08T00:00:00.000Z",
      });
      const validation = validateProfessionalMaterialQuantityAccuracy({
        templateId: revision.selectedTemplateId,
        family: revision.matchedFamily,
        rows: revision.boq.rows,
      });

      expect(validation.blockingReasons).not.toContain("static_quantity_noise_detected");
      expect(validation.passed).toBe(true);
    }
  });
});
