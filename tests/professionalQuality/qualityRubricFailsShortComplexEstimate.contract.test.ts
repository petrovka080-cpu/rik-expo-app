import { evaluateProfessionalEstimatorQuality } from "../../src/lib/ai/professionalQuality";
import { shortComplexEstimate } from "./professionalEstimatorQualityTestHelpers";

describe("professional estimator quality rubric complex depth", () => {
  it("fails short complex estimates before self-correction", () => {
    const report = evaluateProfessionalEstimatorQuality(shortComplexEstimate());
    expect(report.passed).toBe(false);
    expect(report.complexity).toBe("complex");
    expect(report.shortComplexEstimate).toBe(true);
    expect(report.blockers.some((blocker) => blocker.startsWith("SHORT_COMPLEX_ESTIMATE"))).toBe(true);
  });
});
