import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no second framework", () => {
  it("does not allow parallel AI framework directories", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.second_ai_framework_created).toBe(false);
  });
});
