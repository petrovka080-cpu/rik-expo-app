import { estimate } from "./smartEstimatorTestHelpers";

describe("smart estimator missing quantity clarification", () => {
  it("asks for quantity after work and region are known", () => {
    const result = estimate({ user_input: "укладка ковролина Бишкек" });
    expect(result.status).toBe("NEEDS_CLARIFICATION");
    expect(result.clarification?.reason).toBe("MISSING_QUANTITY");
  });
});
