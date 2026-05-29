import { validateAiEstimateErrorBudget } from "../../src/lib/ai/productionCanary";
import { errorBudgetMetrics } from "./productionCanaryTestHelpers";

test("replay error budget blocks weak generic rows", () => {
  const result = validateAiEstimateErrorBudget(errorBudgetMetrics({ weakGenericRowsFound: 1 }));
  expect(result.decision).toBe("NO_GO_INTERNAL_CANARY");
  expect(result.failures).toContain("WEAK_GENERIC_ROWS_RATE_NON_ZERO");
});
