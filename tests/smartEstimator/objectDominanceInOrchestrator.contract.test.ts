import { estimate } from "./smartEstimatorTestHelpers";

describe("smart estimator object dominance", () => {
  it("lets the object dominate the generic operation word", () => {
    const result = estimate({ user_input: "укладка коврового покрытия 305 м2", region: "KZ_ASTANA" });
    expect(result.work_resolution.selected_work_key).toBe("carpet_laying");
    expect(result.snapshot?.professional_snapshot.group_key).toBe("flooring");
  });
});
