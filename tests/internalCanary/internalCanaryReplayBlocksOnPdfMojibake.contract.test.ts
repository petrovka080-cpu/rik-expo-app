import { evaluateInternalCanaryErrorBudget } from "../../src/lib/ai/productionCanary";
import { internalCanaryErrorBudgetMetrics } from "./internalCanaryTestHelpers";

test("internal canary replay blocks PDF mojibake", () => {
  const result = evaluateInternalCanaryErrorBudget(internalCanaryErrorBudgetMetrics({ pdfMojibakeFound: 1 }));
  expect(result.error_budget_passed).toBe(false);
  expect(result.failures).toContain("PDF_MOJIBAKE_RATE_NON_ZERO");
});
