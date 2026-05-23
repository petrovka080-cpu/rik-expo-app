import { UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("AI estimate source evidence", () => {
  it("ties every priced row to source evidence", () => {
    for (const testCase of UNFINISHED_AI_ESTIMATE_CASES) {
      const answer = expectCaseValid(testCase);
      const sourceIds = new Set(answer.toolResult.estimate?.sources.map((source) => source.id));
      for (const row of answer.toolResult.estimate?.sections.flatMap((section) => section.rows) ?? []) {
        expect(row.sourceId).toBeTruthy();
        expect(sourceIds.has(row.sourceId)).toBe(true);
        expect(row.sourceEvidence.length).toBeGreaterThan(0);
      }
    }
  });
});
