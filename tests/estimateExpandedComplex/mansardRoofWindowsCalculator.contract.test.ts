import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("mansard roof windows calculator", () => {
  it("extracts roof window count and calculates roof layers, insulation and flashings", () => {
    const estimate = expectExpandedPrompt({
      prompt: "мансардная крыша 200 м² с 6 окнами металлочерепица утепление 200 мм",
      familyId: "mansard_roof_with_windows",
      calculatorId: "mansardRoofWindowsCalculator",
      minRows: 12,
      requiredCodes: [
        "covering_area_m2",
        "underroof_membrane_m2",
        "vapor_barrier_m2",
        "insulation_m3",
        "roof_windows_pcs",
        "flashing_kits_pcs",
        "rafters_lm_or_timber_m3",
        "battens_lm",
      ],
    });

    expect(rowByCode(estimate, "roof_windows_pcs").quantity).toBe(6);
    expect(rowByCode(estimate, "insulation_m3").quantity).toBe(40);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
