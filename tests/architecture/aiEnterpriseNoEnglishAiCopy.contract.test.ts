import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no English AI copy", () => {
  it("keeps live AI user-facing labels Russian", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.english_user_facing_ai_copy_found).toBe(0);
    expect(matrix.russian_ai_copy_guard_ready).toBe(true);
  });
});
