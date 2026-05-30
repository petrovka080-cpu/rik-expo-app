import { expectNoCanaryEvaluationPattern } from "./canaryEvaluationArchitectureTestHelpers";

test("canary evaluation adds no inline BOQ rows in screens", () => {
  expectNoCanaryEvaluationPattern(/visibleRows\s*:\s*\[|boqRows\s*:\s*\[/i, "inline_rows");
});
