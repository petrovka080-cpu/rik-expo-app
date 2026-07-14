import {
  confirmRealMaterialQuantityEstimate,
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("director PDF professional real quantity estimate", () => {
  it("binds confirmed material and work rows to director PDF without raw AI payload", () => {
    const preview = createRealMaterialQuantityPreview({
      rawInput: "каменную кладку 400 кв метра",
      parameters: {
        material_type: "газоблок",
        wall_thickness_mm: 200,
      },
    });
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    const confirmed = confirmRealMaterialQuantityEstimate({
      preview,
      userConfirmed: true,
      actorUserId: "user:test",
      companyId: "company:test",
      confirmedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(confirmed.directorPdf.containsMaterialRows).toBe(true);
    expect(confirmed.directorPdf.containsWorkRows).toBe(true);
    expect(confirmed.directorPdf.unitsLocalized).toBe(true);
    expect(confirmed.directorPdf.rawAiJsonVisible).toBe(false);
    expect(confirmed.directorPdf.rawTemplateCodesVisible).toBe(false);
    expect(confirmed.snapshot.formulaOutputs.length).toBe(preview.rows.length);
  });
});
