import { carpetEstimate } from "./smartEstimatorTestHelpers";

describe("smart estimator carpet estimate", () => {
  it("uses the carpet professional template", () => {
    const result = carpetEstimate();
    expect(result.work_resolution.selected_work_key).toBe("carpet_laying");
    expect(result.snapshot?.professional_snapshot.group_key).toBe("flooring");
  });
});
