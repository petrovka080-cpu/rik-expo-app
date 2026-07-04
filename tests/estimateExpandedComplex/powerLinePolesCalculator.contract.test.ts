import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("power line poles calculator", () => {
  it("extracts line length and pole step for overhead power lines", () => {
    const estimate = expectExpandedPrompt({
      prompt: "ЛЭП 10 кВ 2 км шаг опор 50 м",
      familyId: "overhead_power_line_10kv",
      calculatorId: "powerLinePolesCalculator",
      requiredCodes: [
        "poles_count",
        "conductor_lm",
        "insulators_pcs",
        "grounding_sets_pcs",
        "pole_foundation_concrete_m3",
        "electrical_testing_services",
      ],
    });

    expect(estimate.input_parameters.length_m).toBe(2000);
    expect(rowByCode(estimate, "poles_count").quantity).toBe(41);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
