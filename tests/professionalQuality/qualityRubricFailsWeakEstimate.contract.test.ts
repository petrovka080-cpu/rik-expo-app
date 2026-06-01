import { scoreProfessionalEstimateRows } from "../../scripts/e2e/runProfessionalEstimatorQualityProof";

describe("professional estimator weak-row rubric", () => {
  it("fails shallow generic estimates before UI or PDF proof", () => {
    const result = scoreProfessionalEstimateRows({
      workKey: "metal_canopy_installation",
      rowNames: ["material", "work", "installation"],
      minimumRows: 18,
    });

    expect(result.passed).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "ROW_DEPTH_TOO_LOW:3/18",
        "WEAK_GENERIC_ROW:material",
        "WEAK_GENERIC_ROW:work",
        "WEAK_GENERIC_ROW:installation",
      ]),
    );
  });
});
