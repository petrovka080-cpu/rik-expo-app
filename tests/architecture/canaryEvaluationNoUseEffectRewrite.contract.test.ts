import { expectNoCanaryEvaluationPattern } from "./canaryEvaluationArchitectureTestHelpers";

test("canary evaluation adds no useEffect answer rewrite", () => {
  expectNoCanaryEvaluationPattern(/useEffect\s*\([^)]*(?:estimate|answer|boq|pdf)/is, "use_effect_rewrite");
});
