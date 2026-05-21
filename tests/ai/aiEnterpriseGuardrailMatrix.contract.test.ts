import { AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS } from "../../src/lib/ai/enterpriseGuardrails";
import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { expectEnterpriseGreenMatrix } from "../architecture/aiEnterpriseGuardrailsTestHelpers";

describe("AI enterprise guardrail matrix", () => {
  it("matches the required green matrix shape", () => {
    const matrix = expectEnterpriseGreenMatrix();
    expect(matrix.final_status).toBe(AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS);
    expect(matrix.guardrail_runner_added).toBe(true);
    expect(matrix.guardrail_runner_in_release_verify).toBe(true);
    expect(matrix.release_verify_passed).toBe(true);
    expect(matrix.internal_fact_requires_source_ref).toBe(true);
    expect(matrix.internal_object_requires_deep_link).toBe(true);
    expect(matrix.explicit_question_beats_screen_default).toBe(true);
    expect(matrix.general_knowledge_marked_as_draft).toBe(true);
    expect(matrix.accounting_advice_requires_review).toBe(true);
  });

  it("is wired into release verify", () => {
    expect(REQUIRED_RELEASE_GATES).toContainEqual({
      name: "enterprise-ai-architecture-guardrails",
      command: "npx tsx scripts/ai/runAiEnterpriseArchitectureGuardrails.ts",
    });
  });
});
