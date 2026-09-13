import fs from "node:fs";
import path from "node:path";
import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  clearProductionExpandedEstimate10000Caches,
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  validateProductionTemplateBoqDefinition10000,
  validateProductionTemplatePricingDefinition10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("extended 10000-template validation single-pass contract", () => {
  afterEach(() => clearProductionExpandedEstimate10000Caches());

  it("reuses one compiled observation across BoQ and pricing checks", () => {
    const definition = PRODUCTION_WORK_DEFINITIONS_10000[0];
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const compiled = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 54,
      countryCode: "KG",
    });

    expect(validateProductionTemplateBoqDefinition10000({ definition, template, compiled }).passed).toBe(true);
    expect(validateProductionTemplatePricingDefinition10000({ definition, template, compiled }).passed).toBe(true);
  });

  it("does not invoke either full-catalog validator from inside the extended pass", () => {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/ai/estimateTemplate10000/productionTemplateExtendedValidation.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("validateAllProductionTemplatesBoq10000(");
    expect(source).not.toContain("validateAllProductionTemplatesPricing10000(");
    expect(source).toContain("validateProductionTemplateBoqDefinition10000({ definition, template, compiled })");
    expect(source).toContain("validateProductionTemplatePricingDefinition10000({ definition, template, compiled })");
  });
});
