import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate source truth", () => {
  it("uses backend source evidence instead of fake labels", () => {
    const answer = answerCase(P0_UNFINISHED_AI_ESTIMATE_CASES[0]);
    const evidence = answer.toolResult.estimate?.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceEvidence)) ?? [];
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((item) => item.sourceId && item.checkedAt && item.confidence)).toBe(true);
    expect(evidence.map((item) => item.label).join("\n")).not.toMatch(/fake|mock|placeholder/i);
  });
});
