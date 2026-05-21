import { runAiRoleMixed150Evaluation } from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: numeric assertions", () => {
  it("checks real expected numbers instead of only answer shape", () => {
    const { questions, guardResults, matrix } = runAiRoleMixed150Evaluation();
    const allNumericAssertions = guardResults.flatMap((result) => result.numericAssertions);

    expect(matrix.expected_numeric_facts_required).toBe(true);
    expect(matrix.positive_questions_missing_numeric_facts).toBe(0);
    expect(matrix.wrong_numeric_facts_found).toBe(0);
    expect(allNumericAssertions.length).toBeGreaterThan(300);
    expect(allNumericAssertions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "may_requests_total", expected: 14, passed: true }),
        expect.objectContaining({ key: "purchase_needed", expected: 60, passed: true }),
        expect.objectContaining({ key: "payments_missing_docs_sum", expected: 245000, passed: true }),
      ]),
    );
    expect(questions.every((question) =>
      question.answerMode === "empty_state_regression" ||
      question.answerMode === "permission_limited_required" ||
      question.answerMode === "security_refusal_required" ||
      question.expectedNumericFacts.length > 0,
    )).toBe(true);
  });
});
