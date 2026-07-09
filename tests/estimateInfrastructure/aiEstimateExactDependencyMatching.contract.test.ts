import {
  auditAiEstimateExactDependencyMatching,
  GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING,
} from "../../scripts/estimate/auditAiEstimateExactDependencyMatching";

describe("AI estimate exact dependency matching", () => {
  it("does not use substring dependency matching for construction parameters", () => {
    const result = auditAiEstimateExactDependencyMatching();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING);
    expect(result.area_m2_not_matched_inside_road_area_m2).toBe(true);
    expect(result.area_not_matched_inside_aeration).toBe(true);
    expect(result.ceiling_word_not_ceiling_height_without_phrase).toBe(true);
    expect(result.kv_meters_not_voltage).toBe(true);
  });
});
