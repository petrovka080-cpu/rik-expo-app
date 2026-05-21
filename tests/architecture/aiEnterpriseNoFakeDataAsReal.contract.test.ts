import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no fake data as real", () => {
  it("does not present demo or fixture data as user data", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.fake_data_presented_as_real).toBe(false);
    expect(matrix.demo_fixture_presented_as_real).toBe(false);
  });
});
