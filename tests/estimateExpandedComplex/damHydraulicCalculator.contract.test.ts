import { expectExpandedPrompt, expectExpandedSnapshotPdfBuyer, rowByCode } from "./expandedComplexTestHelpers";

describe("dam hydraulic calculator", () => {
  it("keeps dam estimates preliminary and calculates embankment, core, membrane and equipment", () => {
    const estimate = expectExpandedPrompt({
      prompt: "дамба земляная 200 м высота 5 м",
      familyId: "earth_dam",
      calculatorId: "damHydraulicCalculator",
      minRows: 10,
      requiredCodes: [
        "embankment_fill_m3",
        "core_material_m3",
        "geomembrane_m2",
        "geotextile_m2",
        "riprap_m3",
        "compactor_shifts",
        "dump_truck_trips",
      ],
    });

    expect(rowByCode(estimate, "embankment_fill_m3").quantity).toBeGreaterThan(20000);
    expect(estimate.missing_design_inputs.join(" ")).toMatch(/Гидрология|профиль|Проектные/i);
    expectExpandedSnapshotPdfBuyer(estimate);
  });
});
