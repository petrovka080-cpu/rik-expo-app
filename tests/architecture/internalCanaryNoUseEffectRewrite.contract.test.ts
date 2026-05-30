import { expectNoInternalCanaryPattern } from "./internalCanaryArchitectureTestHelpers";

test("internal canary adds no useEffect answer rewrite", () => {
  expectNoInternalCanaryPattern(/useEffect\s*\(|setAnswer|rewriteAnswer/i, "use_effect_rewrite");
});
