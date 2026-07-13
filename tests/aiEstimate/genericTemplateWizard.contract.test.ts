import {
  getProductionExpandedTemplate10000,
  queryProductionTemplateCatalogBackend10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  parseProfessionalEstimateCalculatorIntent,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("AI estimate generic template wizard", () => {
  it("builds wizard inputs from template schema instead of a hardcoded work form", () => {
    const input = representativeProfessionalEstimateCalculatorInput();
    const intent = parseProfessionalEstimateCalculatorIntent(input);
    if (!intent.selectedWorkKey) throw new Error("representative work key missing");
    const template = getProductionExpandedTemplate10000(intent.selectedWorkKey);

    expect(queryProductionTemplateCatalogBackend10000().count).toBe(10000);
    expect(intent.templateCatalogIsSourceOfTruth).toBe(true);
    expect(intent.aiIsSourceOfTruth).toBe(false);
    expect(template.requiredInputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "q", required: true }),
    ]));
    expect(template.rows.every((row) => row.recipeId && row.formulaDefinitionId)).toBe(true);
  });
});
