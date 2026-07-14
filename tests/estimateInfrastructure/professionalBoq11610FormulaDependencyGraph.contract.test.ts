import { auditProfessionalBoq11610FormulaDependencyGraph } from "../../scripts/estimate/auditProfessionalBoq11610FormulaDependencyGraph";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

describe("professional BOQ 11610 formula dependency graph", () => {
  it("uses exact identifier matching and blocks old substring regressions", () => {
    const summary = auditProfessionalBoq11610FormulaDependencyGraph();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.formula_dependency_graph_coverage).toBe("11610/11610");
    expect(summary.exact_identifier_matching).toBe(true);
    expect(summary.substring_dependency_matching_absent).toBe(true);
    expect(summary.area_m2_does_not_match_road_area_m2_by_substring).toBe(true);
    expect(summary.area_does_not_match_aeration).toBe(true);
    expect(summary.ceiling_word_not_misclassified_as_ceiling_height_without_height_phrase).toBe(true);
    expect(summary.kv_metra_not_misclassified_as_voltage).toBe(true);
    expect(summary.generic_area_m2_not_used_when_specialized_area_exists).toBe(true);
  });
});
