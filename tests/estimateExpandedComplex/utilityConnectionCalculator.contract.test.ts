import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("utility connection calculator", () => {
  it("groups water, sewer, power and commissioning for multi-utility trenches", () => {
    const estimate = expectExpandedPrompt({
      prompt: "подведение инженерных сетей 100 м вода канализация электричество",
      familyId: "multi_utility_trench",
      calculatorId: "utilityConnectionCalculator",
      requiredCodes: [
        "water_pipe_lm",
        "sewer_pipe_lm",
        "power_cable_lm",
        "utility_trench_m3",
        "service_chambers_pcs",
        "testing_commissioning",
      ],
    });

    expect(rowByCode(estimate, "water_pipe_lm").quantity).toBe(100);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
