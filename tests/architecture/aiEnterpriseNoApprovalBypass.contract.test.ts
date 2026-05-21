import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no approval bypass", () => {
  it("keeps auto approval and final submit disabled", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.approval_bypass_found).toBe(0);
    expect(matrix.auto_approval_found).toBe(0);
  });
});
