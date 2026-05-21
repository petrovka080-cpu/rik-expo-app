import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no runtime debug leak", () => {
  it("keeps provider/runtime/raw payload/internal terms out of normal AI user copy", () => {
    const matrix = getAiEnterpriseGuardrailMatrix();
    expect(matrix.runtime_debug_visible_to_normal_users).toBe(false);
    expect(matrix.provider_unavailable_copy_visible_to_normal_users).toBe(false);
    expect(matrix.raw_payload_visible_to_normal_users).toBe(false);
    expect(matrix.intent_entity_visible_to_normal_users).toBe(false);
  });
});
