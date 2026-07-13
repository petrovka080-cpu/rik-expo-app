import { carpetEstimate } from "./smartEstimatorTestHelpers";

describe("smart estimator user input to expanded estimate", () => {
  it("builds an expanded professional snapshot from user input", () => {
    const result = carpetEstimate();
    expect(result.status).toBe("PARTIAL_PRICE_MISSING");
    expect(result.snapshot?.professional_snapshot.lines.length).toBeGreaterThanOrEqual(20);
  });
});
