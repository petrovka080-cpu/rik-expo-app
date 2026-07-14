import {
  getProductionExpandedTemplate10000,
  queryProductionTemplateCatalogBackend10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("request estimate parameter wizard schema", () => {
  it("loads parameter schema on demand from the selected template", () => {
    const backend = queryProductionTemplateCatalogBackend10000();
    const template = getProductionExpandedTemplate10000(backend.templates[0].workKey);

    expect(template.requiredInputs.length).toBeGreaterThan(0);
    expect(template.requiredInputs.every((input) => input.key && input.labelRu && input.unit && input.required)).toBe(true);
    expect(template.rows.every((row) => row.formulaDefinitionId && row.recipeId)).toBe(true);
  });
});
