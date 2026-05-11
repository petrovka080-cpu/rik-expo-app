import { readFileSync } from "fs";
import { join } from "path";
import { evaluateAiToolPlanPolicyArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

const policyPath = "src/features/ai/tools/aiToolPlanPolicy.ts";

describe("AI tool plan policy architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiToolPlanPolicyArchitectureGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_tool_plan_policy_architecture",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      policyPresent: true,
      plansAllRegisteredTools: true,
      blocksUnknownTools: true,
      requiresSafeReadBindings: true,
      directExecutionDisabled: true,
      mutationDisabled: true,
      providerCallsDisabled: true,
      dbAccessDisabled: true,
      noLiveExecutionBoundary: true,
      noProviderImports: true,
      noSupabaseImports: true,
    });
  });

  it("keeps the policy metadata-only without runner, provider, or database access", () => {
    const source = readFileSync(join(process.cwd(), policyPath), "utf8");
    expect(source).toContain("planAiToolUse");
    expect(source).toContain("tool_not_registered");
    expect(source).toContain("safe_read_binding_missing");
    expect(source).toContain("directExecutionEnabled: false");
    expect(source).toContain("mutationAllowed: false");
    expect(source).toContain("providerCallAllowed: false");
    expect(source).toContain("dbAccessAllowed: false");
    expect(source).not.toMatch(/\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(/);
    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|service_role/);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
