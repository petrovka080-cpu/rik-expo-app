import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 estimate template binding", () => {
  it("binds every estimate case to a template ID", () => {
    const estimates = PHASE1_CASES.filter((testCase) => testCase.intent === "estimate");
    expect(estimates.length).toBeGreaterThan(0);
    expect(estimates.every((testCase) => Boolean(testCase.templateId))).toBe(true);
  });
});
