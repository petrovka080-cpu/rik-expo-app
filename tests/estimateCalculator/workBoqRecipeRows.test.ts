import { getProfessionalWorkPassport } from "../../src/lib/estimate/professionalWorkPassportRegistry";

const SAMPLE_TEMPLATE_IDS = [
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

describe("work BOQ recipe rows", () => {
  it("keeps priority passports specific and source-backed", () => {
    const passports = SAMPLE_TEMPLATE_IDS.map((templateId) => {
      const passport = getProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`passport_missing:${templateId}`);
      return passport;
    });

    expect(passports.every((passport) => passport.boqRecipe.workRows.length > 0)).toBe(true);
    expect(passports.every((passport) => passport.boqRecipe.materialRows.length > 0)).toBe(true);
    expect(passports.every((passport) => passport.boqRecipe.serviceRows.length + passport.boqRecipe.equipmentRows.length > 0)).toBe(true);
    expect(passports.every((passport) =>
      passport.boqRecipe.allRows.every((row) =>
        row.quantityFormula &&
        row.formulaId &&
        row.normSourceId &&
        row.calculationTraceTemplate &&
        row.titleRu !== passport.localizedNameRu
      )
    )).toBe(true);
  });
});
