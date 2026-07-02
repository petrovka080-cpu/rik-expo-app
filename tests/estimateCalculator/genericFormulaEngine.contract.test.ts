import {
  compileProductionExpandedEstimate10000,
  evaluateProductionFormulaDsl,
  PRODUCTION_WORK_DEFINITIONS_10000,
  validateProductionFormulaDsl,
} from "../../src/lib/ai/estimateTemplate10000";

describe("generic formula DSL engine", () => {
  it("evaluates deterministic expressions without LLM or UI dependencies", () => {
    const result = evaluateProductionFormulaDsl(
      "max(1, ceil(unit_convert(q, 1.1) / packageSize)) + if(wastePercent > 0, 2, 0)",
      { q: 100, packageSize: 30, wastePercent: 5 },
    );

    expect(result.value).toBe(6);
    expect(result.functionsUsed).toEqual(expect.arrayContaining(["ceil", "if", "max", "unit_convert"]));
    expect(result.variablesUsed).toEqual(expect.arrayContaining(["q", "packageSize", "wastePercent"]));
    expect(result.trace).toContain("expression=");
  });

  it("rejects invalid expressions and missing parameters", () => {
    expect(validateProductionFormulaDsl("q *", { q: 1 }).valid).toBe(false);
    expect(validateProductionFormulaDsl("q * missing", { q: 1 }).errors[0]).toContain("MISSING_PARAMETER");
  });

  it("keeps cached compiled BOQ results immutable", () => {
    const sampleWorkKey = PRODUCTION_WORK_DEFINITIONS_10000[0]?.workKey;
    expect(sampleWorkKey).toBeTruthy();

    const estimate = compileProductionExpandedEstimate10000({
      workKey: sampleWorkKey!,
      quantity: 54,
      countryCode: "KG",
    });

    expect(Object.isFrozen(estimate)).toBe(true);
    expect(Object.isFrozen(estimate.rows)).toBe(true);
    expect(Object.isFrozen(estimate.rows[0])).toBe(true);
    expect(Object.isFrozen(estimate.rows[0]?.sourceParameters)).toBe(true);
  });
});
