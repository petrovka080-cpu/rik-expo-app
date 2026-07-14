import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("hydro power plant calculator", () => {
  it("does not invent hydrology and keeps HPP equipment as missing-price rows", () => {
    const estimate = expectExpandedPrompt({
      prompt: "ГЭС 5 МВт деривационный канал 1 км",
      familyId: "hydro_power_plant",
      calculatorId: "hydroPowerPlantCalculator",
      minRows: 8,
      requiredCodes: [
        "earthworks_m3",
        "concrete_m3",
        "channel_lining_m2",
        "powerhouse_concrete_m3",
        "turbines_pcs",
        "gates_valves",
        "commissioning_services",
      ],
    });

    expect(rowByCode(estimate, "turbines_pcs").priceStatus).toBe("PRICE_MISSING");
    expect(estimate.missing_design_inputs.join(" ")).toMatch(/Расход|напор|Гидрология/i);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
