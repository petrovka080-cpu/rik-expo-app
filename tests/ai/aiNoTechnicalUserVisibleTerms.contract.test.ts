import { buildAiRealUserLocalizationAudit } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI technical term UI guard", () => {
  it("does not expose action kinds, provider copy, or internal terms to normal users", () => {
    const audit = buildAiRealUserLocalizationAudit();

    expect(audit.technical_user_visible_ai_terms_found).toBe(0);
    expect(audit.provider_unavailable_copy_visible).toBe(false);
    expect(audit.normal_user_debug_copy_found).toBe(0);
    expect(audit.normal_user_runtime_copy_found).toBe(0);
  });
});
