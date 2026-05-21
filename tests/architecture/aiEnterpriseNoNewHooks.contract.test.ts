import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no new hooks", () => {
  it("keeps enterprise AI layers as pure services/adapters", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.new_hooks_added).toBe(false);
    expect(matrix.new_ai_hooks_found).toBe(0);
  });
});
