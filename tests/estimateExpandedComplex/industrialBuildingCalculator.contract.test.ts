import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("industrial building calculator", () => {
  it("calculates industrial shed quantities without using repair templates", () => {
    const estimate = expectExpandedPrompt({
      prompt: "промышленный корпус 5000 м² металлокаркас",
      familyId: "industrial_shed",
      calculatorId: "industrialBuildingCalculator",
      requiredCodes: [
        "foundation_concrete_m3",
        "frame_concrete_or_steel",
        "envelope_m2",
        "crane_shifts",
      ],
    });

    expect(rowByCode(estimate, "frame_concrete_or_steel").unit).toBe("t");
    expectExpandedSnapshotPdfBuyer(estimate);
  });

  it("routes cable tray galleries to pipe rack calculator, not bridge calculator", () => {
    const estimate = expectExpandedPrompt({
      prompt: "кабельная эстакада 200 м",
      familyId: "pipe_rack",
      calculatorId: "pipeRackCalculator",
      requiredCodes: ["foundation_concrete_m3", "steel_structure_t", "cable_trays_lm", "crane_shifts"],
    });

    expect(rowByCode(estimate, "cable_trays_lm").quantity).toBe(400);
  });
});
