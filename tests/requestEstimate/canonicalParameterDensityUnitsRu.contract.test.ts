import { aiEstimateCanonicalUnitForParameter, aiEstimateRuUnitForParameter } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

describe("human density units for all canonical parameter cards", () => {
  it.each(["rcs_internal_fill_gross_dry_mass_ratio", "rcs_steel_density_kg_m3", "unknown_project_density"])
  ("renders the shared kg_per_m3 unit in Russian without changing the stored unit for %s", key => {
    expect(aiEstimateRuUnitForParameter(key, "kg_per_m3")).toBe("кг/м³");
    expect(aiEstimateCanonicalUnitForParameter(key, "kg_per_m3")).toBe("kg_per_m3");
  });
  it("preserves the existing density spelling, actual bag water unit and honest unknown-unit fallback", () => {
    expect(aiEstimateRuUnitForParameter("unknown_project_density", "kg_m3")).toBe("кг/м³");
    expect(aiEstimateRuUnitForParameter("rcs_internal_fill_mixing_water_l_for_selected_bag", "l")).toBe("л");
    expect(aiEstimateRuUnitForParameter("unknown_project_fact", "custom_project_unit")).toBe("custom_project_unit");
  });
});
