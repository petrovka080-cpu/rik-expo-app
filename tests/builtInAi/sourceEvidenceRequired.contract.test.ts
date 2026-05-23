import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI source evidence required", () => {
  it("requires every priced estimate row to carry source evidence", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.asphalt10000, "asphalt_paving");
    const rows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows) ?? [];
    expect(rows.every((row) => row.unitPrice == null || row.sourceEvidence.length > 0)).toBe(true);
  });
});
