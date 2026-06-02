import { collectAiQualityChecks, expectCheckPassed } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("AI platform architecture", () => {
  it("does not add a second AI framework or exact prompt lookup branch", () => {
    expectCheckPassed(collectAiQualityChecks(), "no_second_ai_framework_or_prompt_lookup");
    expectCheckPassed(collectAiQualityChecks(), "estimate_p0_real_world_prompts_specific_rows");
  });
});
