import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("multi-storey building calculator", () => {
  it("calculates preliminary frame, foundation, rebar, envelope, crane and labor rows", () => {
    const estimate = expectExpandedPrompt({
      prompt: "многоэтажный дом 12 этажей 12000 м² монолит",
      familyId: "high_rise_building",
      calculatorId: "highRiseBuildingCalculator",
      requiredCodes: [
        "foundation_concrete_m3",
        "frame_concrete_or_steel",
        "rebar_t",
        "envelope_m2",
        "crane_shifts",
      ],
    });

    expect(rowByCode(estimate, "foundation_concrete_m3").quantity).toBeGreaterThan(1000);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
