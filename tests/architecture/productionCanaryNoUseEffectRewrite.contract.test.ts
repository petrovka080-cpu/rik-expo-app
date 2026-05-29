import { expectNoProductionCanaryPattern } from "./productionCanaryArchitectureTestHelpers";

test("production canary adds no useEffect answer rewrite", () => {
  expectNoProductionCanaryPattern(/useEffect\s*\(/, "use_effect_rewrite");
});
