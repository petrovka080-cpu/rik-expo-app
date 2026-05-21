import { runAiRoleMixed150Evaluation } from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: no positive empty copouts", () => {
  it("has zero empty or clarification-only answers for positive-data questions", () => {
    const { matrix, guardResults } = runAiRoleMixed150Evaluation();

    expect(matrix.positive_questions_returned_empty).toBe(0);
    expect(matrix.generic_copouts_found).toBe(0);
    expect(matrix.clarification_only_answers_found).toBe(0);
    expect(guardResults.filter((result) => !result.passed)).toEqual([]);
  });
});
