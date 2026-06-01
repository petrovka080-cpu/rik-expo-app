import {
  PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS,
  runProfessionalEstimatorQualityGate,
} from "../../scripts/e2e/runProfessionalEstimatorQualityProof";

describe("professional estimator quality rubric", () => {
  it("scores harvested professional estimates as green", () => {
    const report = runProfessionalEstimatorQualityGate();

    expect(report.final_status).toBe(PROFESSIONAL_ESTIMATOR_QUALITY_GREEN_STATUS);
    expect(report.cases_failed).toBe(0);
    expect(report.cases_passed).toBeGreaterThanOrEqual(8);
    expect(report.weak_generic_rows_blocked).toBe(true);
    expect(report.pdf_structured_table_validated).toBe(true);
    expect(report.fake_green_claimed).toBe(false);
  });
});
