import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("thermal power plant calculator", () => {
  it("does not invent final equipment prices and keeps TPP as preliminary BOQ", () => {
    const estimate = expectExpandedPrompt({
      prompt: "ТЭЦ 100 МВт турбинный зал котельное отделение",
      familyId: "thermal_power_plant",
      calculatorId: "thermalPowerPlantCalculator",
      minRows: 10,
      requiredCodes: [
        "civil_concrete_m3",
        "equipment_foundations_m3",
        "process_piping_lm_or_t",
        "turbine_boiler_generator_equipment",
        "equipment_installation_services",
        "commissioning_services",
      ],
    });

    expect(rowByCode(estimate, "turbine_boiler_generator_equipment").priceStatus).toBe("PRICE_MISSING");
    expect(estimate.assumptions.join(" ")).toMatch(/турбин|котл|генератор|источник/i);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
