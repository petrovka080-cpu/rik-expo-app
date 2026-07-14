import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("village water supply calculator", () => {
  it("extracts pipeline length and diameter and produces trench, pipe, testing and equipment rows", () => {
    const estimate = expectExpandedPrompt({
      prompt: "водоснабжение села 5 км труба ПЭ100 d110",
      familyId: "village_water_supply",
      calculatorId: "villageWaterSupplyCalculator",
      minRows: 12,
      requiredCodes: [
        "trench_excavation_m3",
        "bedding_sand_m3",
        "pipe_lm",
        "valves_pcs",
        "manholes_pcs",
        "hydrants_pcs",
        "pressure_testing_lm",
        "disinfection_lm",
        "excavator_shifts",
      ],
    });

    expect(estimate.input_parameters.length_m).toBe(5000);
    expect(estimate.input_parameters.diameter_mm).toBe(110);
    expect(rowByCode(estimate, "pipe_lm").quantity).toBeGreaterThanOrEqual(5000);
    expectExpandedSnapshotPdfBuyer(estimate);
  });

  it("opens the expanded estimate for village water networks with a water tower wording", () => {
    const estimate = expectExpandedPrompt({
      prompt: "Водоснабжение сёл и наружные сети воды: вода башня",
      familyId: "village_water_supply",
      calculatorId: "villageWaterSupplyCalculator",
      minRows: 13,
      requiredCodes: [
        "trench_excavation_m3",
        "pipe_lm",
        "valves_pcs",
        "water_tower_pcs",
        "pressure_testing_lm",
        "disinfection_lm",
        "excavator_shifts",
      ],
    });

    expect(estimate.input_parameters.water_tower_required).toBe(true);
    expect(rowByCode(estimate, "water_tower_pcs").quantity).toBe(1);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
