import { GREEN_AI_MODEL_REPLACEMENT_PROOF, runAiModelReplacementProof } from "../../scripts/architecture/runAiModelReplacementProof";

describe("AI model replacement proof", () => {
  it("keeps platform contract stable across two provider adapters", async () => {
    const { summary } = await runAiModelReplacementProof({ writeSummary: false });
    expect(summary.final_status).toBe(GREEN_AI_MODEL_REPLACEMENT_PROOF);
    expect(summary.same_ai_cases_passed_with_two_test_providers).toBe(true);
    expect(summary.provider_swap_does_not_bypass_tool_policy).toBe(true);
    expect(summary.provider_swap_does_not_bypass_redaction).toBe(true);
    expect(summary.provider_swap_does_not_bypass_ledger).toBe(true);
  });
});
