import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no unbounded queries", () => {
  it("requires scoped, bounded app data retrieval", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.unbounded_ai_queries_found).toBe(0);
    expect(matrix.queries_require_company_scope).toBe(true);
    expect(matrix.queries_require_role_scope).toBe(true);
    expect(matrix.queries_require_limit_or_count).toBe(true);
  });
});
