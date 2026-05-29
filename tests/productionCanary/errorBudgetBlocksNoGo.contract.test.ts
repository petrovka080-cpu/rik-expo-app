import { validateAiEstimateErrorBudget } from "../../src/lib/ai/productionCanary";
import { errorBudgetMetrics } from "./productionCanaryTestHelpers";

test("error budget blocks canary when production thresholds fail", () => {
  const result = validateAiEstimateErrorBudget(errorBudgetMetrics({ estimatesSucceeded: 1600 }));
  expect(result.error_budget_passed).toBe(false);
  expect(result.decision).toBe("NO_GO_INTERNAL_CANARY");
});
