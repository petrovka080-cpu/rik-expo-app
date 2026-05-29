import { validateAiEstimateErrorBudget } from "../../src/lib/ai/productionCanary";
import { errorBudgetMetrics } from "./productionCanaryTestHelpers";

test("replay error budget blocks PDF mojibake", () => {
  const result = validateAiEstimateErrorBudget(errorBudgetMetrics({ pdfMojibakeFound: 1 }));
  expect(result.decision).toBe("NO_GO_INTERNAL_CANARY");
  expect(result.failures).toContain("PDF_MOJIBAKE_RATE_NON_ZERO");
});
