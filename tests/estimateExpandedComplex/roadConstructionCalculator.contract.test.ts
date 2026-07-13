import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("road construction calculator", () => {
  it("calculates road area, base layers, asphalt and road equipment", () => {
    const estimate = expectExpandedPrompt({
      prompt: "строительство дороги 1 км ширина 6 м асфальт",
      familyId: "road_construction",
      calculatorId: "roadConstructionCalculator",
      minRows: 14,
      requiredCodes: [
        "road_area_m2",
        "earthworks_m3",
        "sand_gravel_subbase_m3",
        "crushed_stone_base_m3",
        "asphalt_t",
        "roller_shifts",
        "paver_shifts",
        "asphalt_truck_trips",
      ],
    });

    expect(estimate.input_parameters.road_area_m2).toBe(6000);
    expect(rowByCode(estimate, "asphalt_t").quantity).toBeGreaterThan(800);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
