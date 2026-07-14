import { carpetEstimate } from "./smartEstimatorTestHelpers";

describe("smart estimator ukladka versus kladka", () => {
  it("does not let ukladka carpet trigger masonry kladka", () => {
    const result = carpetEstimate();
    expect(result.work_resolution.selected_work_key).toBe("carpet_laying");
    expect(result.work_resolution.selected_work_key).not.toBe("brick_masonry");
  });
});
