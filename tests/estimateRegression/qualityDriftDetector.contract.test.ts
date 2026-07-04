import {
  auditEstimateQualityDrift,
  runQualityDriftMutationGates,
  type EstimateQualityMetrics,
} from "../../scripts/estimate/auditEstimateQualityDrift";

describe("estimate quality drift detector", () => {
  it("passes stable metrics and rejects negative drift mutations", () => {
    const baseline: EstimateQualityMetrics = {
      golden_cases_passed: 277,
      zero_tolerance_violations: 0,
      pdf_snapshot_mismatches: 0,
      buyer_handoff_invalid_count: 0,
      catalog_total_templates: 11610,
      pricebook_coverage_percent: 86.13,
    };
    expect(auditEstimateQualityDrift(baseline, baseline).final_status).toBe("GREEN_AI_ESTIMATE_QUALITY_DRIFT");
    expect(runQualityDriftMutationGates()).toMatchObject({
      lower_golden_pass_count_rejected: true,
      zero_tolerance_increase_rejected: true,
      catalog_decrease_rejected: true,
    });
  });
});
