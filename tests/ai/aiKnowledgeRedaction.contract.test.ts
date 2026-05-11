import {
  assertAiKnowledgeTextSafe,
  redactAiKnowledgeText,
} from "../../src/features/ai/knowledge/aiKnowledgeRedaction";

describe("AI knowledge redaction", () => {
  it("redacts raw tokens, ids, prompt/context, provider payload, and row dumps", () => {
    const input = [
      "access_token=abc.def.ghi",
      "Authorization: Bearer secret-token",
      "service role",
      "raw_provider_payload",
      "raw prompt",
      "raw context",
      "raw DB row",
      "user_id=123e4567-e89b-12d3-a456-426614174000",
      "company_id=123e4567-e89b-12d3-a456-426614174000",
      "organization_id=123e4567-e89b-12d3-a456-426614174000",
    ].join("\n");

    const result = redactAiKnowledgeText({ text: input, role: "buyer" });

    expect(result.redactedText).not.toContain("secret-token");
    expect(result.redactedText).not.toContain("123e4567-e89b-12d3-a456-426614174000");
    expect(result.redactedText).toContain("[redacted]");
    expect(result.findings).toEqual(expect.arrayContaining(["access_token", "authorization_header", "service_role"]));
  });

  it("blocks raw finance context for non-finance roles and contractor leakage", () => {
    const result = assertAiKnowledgeTextSafe({
      role: "contractor",
      text: "finance_rows internal_supplier_details other_contractor_data private_accounting_posting",
    });

    expect(result.redactedText).toContain("finance_context[role_scoped]");
    expect(result.redactedText).toContain("supplier_details[role_scoped]");
    expect(result.redactedText).toContain("contractor_data[own_records_only]");
    expect(result.findings).toEqual(
      expect.arrayContaining(["raw_finance_context_for_non_finance_role", "internal_supplier", "other_contractor"]),
    );
  });
});
