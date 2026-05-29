import { expectRepresentativeSemanticFrame } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("semantic frame latency budget", () => {
  it("builds semantic frame within p95 policy", () => {
    const frame = expectRepresentativeSemanticFrame();
    expect(frame.primitive.domain).not.toBe("unknown");
    expect(frame.classification).toBeTruthy();
  });
});
