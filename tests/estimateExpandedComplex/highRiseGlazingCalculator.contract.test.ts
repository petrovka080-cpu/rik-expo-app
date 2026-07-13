import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("high-rise glazing calculator", () => {
  it("calculates glazing, profiles, sealant, anchors and lifting rows", () => {
    const estimate = expectExpandedPrompt({
      prompt: "остекление высотного дома 5000 м²",
      familyId: "high_rise_glazing",
      calculatorId: "highRiseGlazingCalculator",
      minRows: 8,
      requiredCodes: [
        "glazing_units_m2",
        "aluminum_profiles_kg_or_lm",
        "glass_units_m2",
        "gaskets_lm",
        "sealant_l",
        "anchors_pcs",
        "scaffolding_m2_or_mast_climber_shifts",
      ],
    });

    expect(rowByCode(estimate, "glass_units_m2").quantity).toBe(5000);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
