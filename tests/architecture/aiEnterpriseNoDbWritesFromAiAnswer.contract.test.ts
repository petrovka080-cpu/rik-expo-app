import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no DB writes from AI answer", () => {
  it("keeps AI answer paths read-only", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.db_writes_from_ai_answer_used).toBe(false);
  });
});
