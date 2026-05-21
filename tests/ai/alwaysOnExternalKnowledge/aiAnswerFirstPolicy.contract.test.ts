import {
  AI_ANSWER_FIRST_POLICY,
  hasAiDiagnosticsBeforeResult,
  startsWithForbiddenAiDiagnostic,
} from "../../../src/lib/ai/externalKnowledge";

describe("AI answer-first policy", () => {
  it("forbids empty public-knowledge primary answers", () => {
    expect(AI_ANSWER_FIRST_POLICY.publicKnowledgeQuestionsMustAnswer).toBe(true);
    expect(AI_ANSWER_FIRST_POLICY.emptyAnswerAllowedForPublicKnowledge).toBe(false);
    expect(startsWithForbiddenAiDiagnostic("не найдено в приложении")).toBe(true);
    expect(hasAiDiagnosticsBeforeResult("Интернет не использовался\n\nКоротко:\nответ")).toBe(true);
  });
});
