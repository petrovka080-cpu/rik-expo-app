import { carpetEstimate, productionSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator explainability", () => {
  it("includes explanation without missing production explanations", () => {
    expect(carpetEstimate().explanation.price_policy_ru.length).toBeGreaterThan(20);
    expect(productionSummary().explanation_missing).toBe(0);
  });
});
