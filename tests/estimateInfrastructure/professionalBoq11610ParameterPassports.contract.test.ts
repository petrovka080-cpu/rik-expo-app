import { auditProfessionalBoq11610ParameterPassports } from "../../scripts/estimate/auditProfessionalBoq11610ParameterPassports";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(240000);

describe("professional BOQ 11610 parameter passports", () => {
  it("keeps every visible editable parameter connected to calculation", () => {
    const summary = auditProfessionalBoq11610ParameterPassports();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.parameter_passport_coverage).toBe("11610/11610");
    expect(summary.p0_required_parameter_coverage).toBe("11610/11610");
    expect(summary.editable_parameter_connected_to_calculation).toBe(true);
    expect(summary.dead_visible_parameter_cards_count).toBe(0);
    expect(summary.same_generic_parameter_list_for_all_work_types).toBe(false);
    expect(Number(summary.max_visible_missing_parameters_default)).toBeLessThanOrEqual(5);
    expect(summary.raw_parameter_labels_count).toBe(0);
  });
});
