import {
  EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
  EXPANDED_COMPLEX_TEMPLATES,
  EXPANDED_COMPLEX_WORK_FAMILIES,
} from "../../src/lib/ai/expandedComplexWorks";

const REQUIRED_REPRESENTATIVE_FAMILIES = [
  "private_house_construction",
  "multi_storey_residential_building",
  "high_rise_glazing",
  "mansard_roof_with_windows",
  "road_construction",
  "bridge_construction",
  "tunnel_construction",
  "village_water_supply",
  "wastewater_treatment_plant",
  "earth_dam",
  "overhead_power_line_10kv",
  "transformer_substation",
  "multi_utility_trench",
  "gas_pipeline_low_pressure",
  "thermal_power_plant",
  "hydro_power_plant",
  "solar_power_plant",
  "industrial_shed",
  "equipment_foundation",
  "steel_tank",
  "landfill_cell",
  "large_scale_excavation",
  "HVAC_plant_room",
];

describe("expanded complex taxonomy", () => {
  it("creates professional families, templates, schemas, recipes and policies", () => {
    const familyIds = new Set(EXPANDED_COMPLEX_WORK_FAMILIES.map((family) => family.work_family_id));

    expect(EXPANDED_COMPLEX_WORK_FAMILIES.length).toBeGreaterThanOrEqual(180);
    expect(EXPANDED_COMPLEX_TEMPLATES.length).toBeGreaterThanOrEqual(1000);
    expect(EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length).toBeGreaterThanOrEqual(35);
    for (const familyId of REQUIRED_REPRESENTATIVE_FAMILIES) {
      expect(familyIds.has(familyId)).toBe(true);
    }

    for (const family of EXPANDED_COMPLEX_WORK_FAMILIES) {
      expect(family.professionalNameRu.trim().length).toBeGreaterThan(3);
      expect(family.aliases.length).toBeGreaterThan(0);
      expect(family.parameterSchema.length).toBeGreaterThan(0);
      expect(family.formulaFamily).toContain(family.calculatorId);
      expect(family.materialRecipe.length).toBeGreaterThan(0);
      expect(family.laborRecipe.length).toBeGreaterThan(0);
      expect(family.equipmentRecipe.length).toBeGreaterThan(0);
      expect(family.serviceRecipe.length).toBeGreaterThan(0);
      expect(family.normSource.sourceId).not.toMatch(/unknown|generated_family_default|synthetic_family_default/i);
      expect(family.pricePolicy.allowFinalTotalWhenMissing).toBe(false);
      expect(family.estimateLevelPolicy.detailedRequiresDesignInputs).toBe(true);
      expect(family.uiRendererPolicy).toBe("GROUPED_PREVIEW_REQUIRED");
      expect(family.pdfPolicy).toBe("GROUPED_WITH_ASSUMPTIONS_TRACE_AND_SOURCES");
      expect(family.buyerHandoffPolicy).toBe("MATERIAL_EQUIPMENT_DELIVERY_ONLY");
    }
  });
});
