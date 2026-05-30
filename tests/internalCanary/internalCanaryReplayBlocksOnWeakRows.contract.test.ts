import { evaluateInternalCanaryErrorBudget } from "../../src/lib/ai/productionCanary";
import { internalCanaryErrorBudgetMetrics } from "./internalCanaryTestHelpers";

test("internal canary replay blocks weak generic rows", () => {
  const result = evaluateInternalCanaryErrorBudget(internalCanaryErrorBudgetMetrics({ weakGenericRowsFound: 1 }));
  expect(result.error_budget_passed).toBe(false);
  expect(result.failures).toContain("WEAK_GENERIC_ROWS_RATE_NON_ZERO");
});
