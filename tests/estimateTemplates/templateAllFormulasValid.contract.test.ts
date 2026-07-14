import {
  evaluateProductionFormulaDsl,
  validateAllProductionTemplatesBoq10000,
  validateProductionFormulaDsl,
} from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("estimate template formulas", () => {
  it("validates every 10000-template formula through the universal DSL", () => {
    const validation = validateAllProductionTemplatesBoq10000();

    expect(validation.formula_dsl_exists).toBe(true);
    expect(validation.formula_engine_not_llm_based).toBe(true);
    expect(validation.formula_engine_not_ui_component).toBe(true);
    expect(validation.all_10000_templates_formula_valid).toBe(true);
    expect(validation.failures).toEqual([]);
  });

  it("supports arithmetic, unit conversion, conditionals, rounding, waste and package helpers", () => {
    const context = {
      q: 300,
      layerThicknessMm: 20,
      normKgPerM2PerMm: 1.2,
      wastePercent: 10,
      packageSize: 30,
    };
    const materialKg = evaluateProductionFormulaDsl(
      "round_to(q * layerThicknessMm * normKgPerM2PerMm * percent_to_factor(wastePercent), 2)",
      context,
    );
    const bags = evaluateProductionFormulaDsl("ceil(materialKg / packageSize)", {
      ...context,
      materialKg: materialKg.value,
    });
    const conditional = evaluateProductionFormulaDsl("if(q > 250, unit_convert(q, 1.1), q)", context);

    expect(materialKg.value).toBe(7920);
    expect(bags.value).toBe(264);
    expect(conditional.value).toBe(330);
    expect(validateProductionFormulaDsl("q * missingParam", context).valid).toBe(false);
  });
});
