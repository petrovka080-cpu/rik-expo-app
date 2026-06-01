import { runProfessionalEstimatorQualityGate } from "../../scripts/e2e/runProfessionalEstimatorQualityProof";

describe("embedded AI entrypoint professional quality gate", () => {
  it("keeps embedded AI estimates behind the professional quality rubric", () => {
    const report = runProfessionalEstimatorQualityGate();
    const embeddedCases = report.case_results.filter((item) => item.route === "/ai?context=foreman");

    expect(embeddedCases.length).toBeGreaterThanOrEqual(4);
    expect(embeddedCases.every((item) => item.passed)).toBe(true);
  });
});
