import { runProfessionalEstimatorQualityGate } from "../../scripts/e2e/runProfessionalEstimatorQualityProof";

describe("request entrypoint professional quality gate", () => {
  it("keeps request estimates behind the professional quality rubric", () => {
    const report = runProfessionalEstimatorQualityGate();
    const requestCase = report.case_results.find((item) => item.id === "apartment_renovation_depth");

    expect(requestCase).toBeDefined();
    expect(requestCase?.route).toBe("/request");
    expect(requestCase?.passed).toBe(true);
    expect(requestCase?.rowCount).toBeGreaterThanOrEqual(30);
  });
});
