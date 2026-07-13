import {
  createProfessionalEstimateCalculatorPreview,
  parseProfessionalEstimateCalculatorIntent,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("professional estimate AI intent boundary", () => {
  it("lets AI parse intent only while the backend catalog owns the template and rows", () => {
    const input = representativeProfessionalEstimateCalculatorInput();
    const intent = parseProfessionalEstimateCalculatorIntent(input);

    expect(intent.status).toBe("READY_FOR_CALCULATION");
    expect(intent.selectedWorkSource).toBe("user_selected_catalog_key");
    expect(intent.selectedWorkKey).toBe(input.selectedWorkKey);
    expect(intent.aiMayOnlyParseIntent).toBe(true);
    expect(intent.aiIsSourceOfTruth).toBe(false);
    expect(intent.templateCatalogIsSourceOfTruth).toBe(true);
  });

  it("asks for missing calculator params instead of creating empty draft success", () => {
    const input = {
      ...representativeProfessionalEstimateCalculatorInput(),
      quantity: null,
      rawInput: "supported work without quantity",
    };
    const preview = createProfessionalEstimateCalculatorPreview(input);

    expect(preview.status).toBe("NEEDS_CLARIFICATION");
    expect(preview.insertedRows).toBe(0);
    expect(preview.requestDraftLines).toEqual([]);
    if (preview.status !== "NEEDS_CLARIFICATION") return;
    expect(preview.intent.missingParameters).toContain("q");
    expect(preview.clarificationQuestions.length).toBeGreaterThan(0);
    expect(preview.fakeGreenClaimed).toBe(false);
  });
});
