import {
  expandMaterialQuantitySensitivityCases,
  GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE,
  runMaterialQuantitySensitivityAcceptance,
} from "../../scripts/estimate/runMaterialQuantitySensitivityAcceptance";

describe("material quantity sensitivity acceptance", () => {
  jest.setTimeout(900_000);

  it("expands to at least 500 cases and changes procurement quantities when input quantities change", () => {
    const expanded = expandMaterialQuantitySensitivityCases();
    const result = runMaterialQuantitySensitivityAcceptance({ writeSummary: false });

    expect(expanded.length).toBeGreaterThanOrEqual(500);
    expect(result.summary.final_status).toBe(GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_SENSITIVITY_ACCEPTANCE);
    expect(result.summary.expanded_cases_total).toBeGreaterThanOrEqual(500);
    expect(result.summary.cases_failed).toBe(0);
    expect(result.summary.procurement_quantity_sensitive_to_input_params).toBe(true);
  });
});
