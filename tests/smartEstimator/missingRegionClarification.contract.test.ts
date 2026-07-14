import { estimate } from "./smartEstimatorTestHelpers";

describe("smart estimator missing region clarification", () => {
  it("does not silently default a region", () => {
    const result = estimate({ user_input: "укладка ковролина 100 м2" });
    expect(result.status).toBe("NEEDS_CLARIFICATION");
    expect(result.clarification?.reason).toBe("MISSING_REGION");
  });
});
