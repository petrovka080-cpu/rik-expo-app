import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("built-in AI extended 100 case prompt parsing", () => {
  it("routes explicit work keys to professional expanded estimates", () => {
    const summary = extended100CertificationSummary();

    expect(summary.built_in_ai_prompt_parsing_passed).toBe(true);
    expect(summary.prompt_parsing.cases_checked).toBe(100);
    expect(summary.prompt_parsing.failures).toEqual([]);
  });
});
