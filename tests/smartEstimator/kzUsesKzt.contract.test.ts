import { regionalCurrencySummary } from "./smartEstimatorTestHelpers";

describe("smart estimator KZ currency", () => {
  it("uses KZT for KZ", () => {
    expect(regionalCurrencySummary().kz_uses_kzt).toBe(true);
  });
});
