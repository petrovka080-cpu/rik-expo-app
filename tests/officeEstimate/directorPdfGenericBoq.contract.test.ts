import {
  createProfessionalEstimateCalculatorPreview,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("director PDF generic BOQ", () => {
  it("has template versions, calculation trace, and no fake repeated totals in the generic compiled rows", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    expect(preview.compiled.rows.every((row) => row.templateVersion && row.calculationTrace && row.formulaId)).toBe(true);
    expect(preview.compiled.rows.every((row) => row.total === null && row.unitPrice === null)).toBe(true);
    expect(preview.compiled.rows.every((row) => row.calculationTrace.includes("expression="))).toBe(true);
  });
});
