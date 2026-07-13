import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  calculateProfessionalRecipeRowQuantity,
} from "./professionalEstimateTestHelpers";

describe("professional estimate material waste percent", () => {
  it("applies waste percent on material formulas", () => {
    const row = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG
      .flatMap((template) => template.material_recipe_rows)
      .find((candidate) => candidate.waste_percent > 0);
    expect(row).toBeTruthy();
    const result = calculateProfessionalRecipeRowQuantity(row!, { quantity: 100, unit: "m2" });
    expect(result.parse_failed).toBe(false);
    expect(result.waste_applied).toBe(true);
    expect(result.value).toBeGreaterThan(100 * 0.01);
  });
});
