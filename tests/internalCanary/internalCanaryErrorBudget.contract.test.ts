import { evaluateInternalCanaryErrorBudget } from "../../src/lib/ai/productionCanary";
import { internalCanaryErrorBudgetMetrics } from "./internalCanaryTestHelpers";

test("internal canary error budget passes clean execution and blocks failures", () => {
  expect(evaluateInternalCanaryErrorBudget(internalCanaryErrorBudgetMetrics()).decision)
    .toBe("GO_NEXT_INTERNAL_CANARY_STAGE");
  expect(evaluateInternalCanaryErrorBudget(internalCanaryErrorBudgetMetrics({ estimatesSucceeded: 1989 })).decision)
    .toBe("NO_GO_INTERNAL_CANARY_ERROR_BUDGET_EXCEEDED");
});
