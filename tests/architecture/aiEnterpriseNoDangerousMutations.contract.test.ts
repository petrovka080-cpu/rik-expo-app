import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no dangerous mutations", () => {
  it("does not expose direct final business mutations through AI", () => {
    expect(getAiEnterpriseGuardrailMatrix().dangerous_mutations_found).toBe(0);
  });
});
