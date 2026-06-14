import { estimate } from "./smartEstimatorTestHelpers";

describe("smart estimator protocol", () => {
  it("returns only terminal protocol states", () => {
    const result = estimate({ user_input: "укладка ковролина 100 м2 Бишкек" });
    expect(["ESTIMATE_READY", "PARTIAL_PRICE_MISSING", "NEEDS_CLARIFICATION", "WORK_NOT_SUPPORTED"]).toContain(result.status);
    expect(result.fake_green_claimed).toBe(false);
  });
});
