import {
  createProfessionalEstimateCalculatorPreview,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("professional estimate deterministic calculator", () => {
  it("compiles rows through deterministic backend formulas and persists formula outputs", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());

    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    expect(preview.templateSnapshot.sourceCatalog).toBe("production_estimate_template_10000_backend_catalog");
    expect(preview.templateSnapshot.formulaEngine).toBe("compileProductionExpandedEstimate10000");
    expect(preview.templateSnapshot.aiIsSourceOfTruth).toBe(false);
    expect(preview.templateSnapshot.formulaOutputs.length).toBe(preview.compiled.rows.length);
    expect(preview.compiled.rows.length).toBeGreaterThanOrEqual(preview.definition.minimumRows);
    expect(preview.templateSnapshot.formulaOutputs.every((row) => Number.isFinite(row.quantity) && row.quantity >= 0)).toBe(true);
    expect(preview.templateSnapshot.compiledHash).toBe(preview.compiled.compiledHash);
    expect(preview.editableSnapshot.hash).toBe(preview.templateSnapshot.editableSnapshotHash);
  });

  it("is stable for the same template, params, and manual overrides", () => {
    const input = representativeProfessionalEstimateCalculatorInput();
    const first = createProfessionalEstimateCalculatorPreview(input);
    const second = createProfessionalEstimateCalculatorPreview(input);

    expect(first.status).toBe("NEEDS_USER_CONFIRMATION");
    expect(second.status).toBe("NEEDS_USER_CONFIRMATION");
    if (first.status !== "NEEDS_USER_CONFIRMATION" || second.status !== "NEEDS_USER_CONFIRMATION") return;

    expect(first.templateSnapshot.compiledHash).toBe(second.templateSnapshot.compiledHash);
    expect(first.editableSnapshot.hash).toBe(second.editableSnapshot.hash);
    expect(first.requestDraftLines.map((row) => row.rik_code)).toEqual(second.requestDraftLines.map((row) => row.rik_code));
  });
});
