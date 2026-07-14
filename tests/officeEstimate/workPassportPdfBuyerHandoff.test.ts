import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";

const PRIORITY_TEMPLATE_IDS = [
  "village_water_supply_rom_concept_expanded_complex_v1",
  "road_construction_rom_concept_expanded_complex_v1",
  "earth_dam_rom_concept_expanded_complex_v1",
  "overhead_power_line_04kv_rom_concept_expanded_complex_v1",
  "high_rise_glazing_rom_concept_expanded_complex_v1",
  "mansard_roof_rom_concept_expanded_complex_v1",
  "bridge_approach_roads_rom_concept_expanded_complex_v1",
  "tunnel_construction_rom_concept_expanded_complex_v1",
  "pressure_pipeline_industrial_rom_concept_expanded_complex_v1",
];

describe("work passport PDF and buyer handoff", () => {
  it("maps priority work passports to snapshot PDF rows and procurement-only buyer handoff", () => {
    const passports = PRIORITY_TEMPLATE_IDS.map((templateId) => {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`passport_missing:${templateId}`);
      return passport;
    });

    expect(passports).toHaveLength(PRIORITY_TEMPLATE_IDS.length);
    expect(passports.every((passport) => passport.outputMappings.pdfRowsEqualSnapshotRows)).toBe(true);
    expect(passports.every((passport) => passport.outputMappings.pdfIncludesAssumptionsTraceAndSources)).toBe(true);
    expect(passports.every((passport) => passport.outputMappings.buyerHandoffProcurementSubset)).toBe(true);
    expect(passports.every((passport) => passport.outputMappings.buyerHandoffExcludesWorkRows)).toBe(true);
    expect(passports.every((passport) =>
      passport.boqRecipe.allRows.some((row) => row.buyerHandoffRole === "procurement_item")
    )).toBe(true);
    expect(passports.every((passport) =>
      passport.boqRecipe.allRows
        .filter((row) => row.buyerHandoffRole === "procurement_item")
        .every((row) => row.rowType !== "work" && row.rowType !== "labor")
    )).toBe(true);
    expect(passports.every((passport) => passport.riskPolicy.finalTotalAllowedWhenPricesMissing === false)).toBe(true);
  });
});
