import { expectNoCanaryEvaluationPattern } from "./canaryEvaluationArchitectureTestHelpers";

test("canary evaluation adds no screen-local estimate calculation", () => {
  expectNoCanaryEvaluationPattern(/screenLocal|localEstimateRows|calculate.*Screen/i, "screen_local_calculation");
});
