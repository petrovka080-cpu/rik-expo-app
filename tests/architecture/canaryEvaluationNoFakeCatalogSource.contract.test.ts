import { expectNoCanaryEvaluationPattern } from "./canaryEvaluationArchitectureTestHelpers";

test("canary evaluation does not introduce fake catalog or source evidence", () => {
  expectNoCanaryEvaluationPattern(/fake\s*(?:catalog|source|supplier|stock|availability)/i, "fake_catalog_source");
});
