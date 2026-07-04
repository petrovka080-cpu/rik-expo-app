import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("sewer network calculator", () => {
  it("calculates sewer trench, pipe, manholes and hydraulic testing", () => {
    const estimate = expectExpandedPrompt({
      prompt: "наружная канализация 2 км труба d200",
      familyId: "village_sewer_network",
      calculatorId: "sewerNetworkCalculator",
      requiredCodes: [
        "sewer_trench_excavation_m3",
        "pipe_bedding_sand_m3",
        "sewer_pipe_lm",
        "inspection_manhole_pcs",
        "hydraulic_testing_lm",
      ],
    });

    expect(estimate.input_parameters.length_m).toBe(2000);
    expect(rowByCode(estimate, "sewer_pipe_lm").quantity).toBeGreaterThanOrEqual(2000);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
