import { validateAiEstimateCanaryPolicy } from "../../src/lib/ai/productionCanary";
import { canaryConfig } from "./productionCanaryTestHelpers";

test("canary percent is capped at one percent", () => {
  expect(validateAiEstimateCanaryPolicy(canaryConfig()).max_canary_percent_lte_1).toBe(true);
  expect(validateAiEstimateCanaryPolicy(canaryConfig({ max_canary_percent: 2 })).issues).toContain("CANARY_PERCENT_GT_1");
});
