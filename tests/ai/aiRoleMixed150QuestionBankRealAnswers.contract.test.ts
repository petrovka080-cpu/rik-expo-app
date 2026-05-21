import {
  getAiRoleMixed150QuestionBank,
  runAiRoleMixed150Evaluation,
} from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: question bank distribution", () => {
  it("contains 150 questions with 140 positive useful-answer questions", () => {
    const questions = getAiRoleMixed150QuestionBank();
    const matrix = runAiRoleMixed150Evaluation().matrix;

    expect(questions).toHaveLength(150);
    expect(matrix.questions_total).toBe(150);
    expect(matrix.positive_questions_total_min).toBeGreaterThanOrEqual(140);
    expect(matrix.positive_internal_questions_min).toBeGreaterThanOrEqual(95);
    expect(matrix.positive_external_questions_min).toBeGreaterThanOrEqual(35);
    expect(matrix.typo_positive_questions_min).toBeGreaterThanOrEqual(10);
    expect(matrix.empty_state_questions_max).toBeLessThanOrEqual(5);
    expect(matrix.security_permission_questions_min).toBeGreaterThanOrEqual(5);
  });
});
