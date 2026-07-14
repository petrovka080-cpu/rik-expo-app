import { auditAiPlatformNoBusinessLogicInHooks, GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS } from "../../scripts/architecture/auditAiPlatformNoBusinessLogicInHooks";

describe("AI platform UI hook boundary", () => {
  it("keeps provider, prompt, tools and approvals out of AI UI hooks", () => {
    const result = auditAiPlatformNoBusinessLogicInHooks();
    expect(result.final_status).toBe(GREEN_AI_PLATFORM_NO_BUSINESS_LOGIC_IN_HOOKS);
    expect(result.ai_business_logic_in_hooks_count).toBe(0);
    expect(result.provider_calls_in_components_count).toBe(0);
    expect(result.tool_execution_in_components_count).toBe(0);
    expect(result.approval_mutation_in_components_count).toBe(0);
  });
});
