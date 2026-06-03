import { evaluateProfessionalEstimatorQuality } from "../../src/lib/ai/professionalQuality";
import { QUALITY_PROMPTS, qualityEstimate } from "./professionalEstimatorQualityTestHelpers";

describe("professional estimator quality rubric", () => {
  it("scores professional estimates above their complexity threshold", () => {
    for (const prompt of Object.values(QUALITY_PROMPTS)) {
      const report = evaluateProfessionalEstimatorQuality(qualityEstimate(prompt));
      expect(report.passed).toBe(true);
      expect(report.scores.semantic_accuracy_score).toBe(100);
      expect(report.scores.ui_pdf_parity_score).toBe(100);
      for (const value of Object.values(report.scores)) {
        expect(value).toBeGreaterThanOrEqual(report.threshold);
      }
    }
  });
});
