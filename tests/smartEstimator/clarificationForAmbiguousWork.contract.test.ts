import { ambiguousEstimate } from "./smartEstimatorTestHelpers";

describe("smart estimator ambiguous clarification", () => {
  it("asks for work clarification for broad work input", () => {
    const result = ambiguousEstimate();
    expect(result.status).toBe("NEEDS_CLARIFICATION");
    expect(result.clarification?.reason).toBe("AMBIGUOUS_WORK_INPUT");
  });
});
