import { auditProfessionalBoq11610WorkFamilyCoverage } from "../../scripts/estimate/auditProfessionalBoq11610WorkFamilyCoverage";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ 11610 work-family coverage", () => {
  it("classifies all 11610 templates and covers critical work families", () => {
    const summary = auditProfessionalBoq11610WorkFamilyCoverage();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.work_family_classification_coverage).toBe("11610/11610");
    expect(summary.critical_work_families_covered).toBe(true);
    expect(summary.unknown_work_family_count).toBe(0);
    expect(summary.generic_other_family_reasoned_count_recorded).toBe(true);
    expect(summary.everything_classified_as_other).toBe(false);
    expect(summary.capital_repair_only_parameter_quality).toBe(false);
  });
});
