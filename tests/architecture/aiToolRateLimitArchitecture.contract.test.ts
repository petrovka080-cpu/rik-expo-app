import { evaluateAiToolRateLimitPolicyGuardrail } from "../../scripts/architecture_anti_regression_suite";

const allToolNames = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
] as const;

describe("AI tool rate-limit architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiToolRateLimitPolicyGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_tool_rate_limit_policy",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      policyFilesPresent: true,
      allToolsHaveRateLimitScope: true,
      allToolsHaveBudgetPolicy: true,
      allToolsHaveMaxPayload: true,
      allToolsHaveRoleScope: true,
      approvalToolsRequireIdempotency: true,
      toolPlanIncludesRateDecision: true,
      agentBffExposesRateDecision: true,
      runtimeToolsUseRateDecision: true,
      noProviderImports: true,
      noSupabaseImports: true,
      noProductionEnvMutation: true,
    });
  });

  it("fails if a runtime tool bypasses the rate policy", () => {
    const result = evaluateAiToolRateLimitPolicyGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("aiToolRateLimitPolicy.ts")) {
          return allToolNames
            .map((toolName) =>
              [
                `toolName: "${toolName}"`,
                `rateLimitScope: "ai.tool.${toolName}"`,
                "allowedRoles:",
                "roleScoped: true",
                toolName === "submit_for_approval" ? "idempotencyRequired: true" : "idempotencyRequired: false",
              ].join("\n"),
            )
            .join("\n");
        }
        if (relativePath.endsWith("aiToolBudgetPolicy.ts")) {
          return allToolNames
            .map((toolName) =>
              [
                `toolName: "${toolName}"`,
                "maxPayloadBytes:",
                "maxResultLimit:",
                toolName === "submit_for_approval" ? "idempotencyRequired: true" : "idempotencyRequired: false",
              ].join("\n"),
            )
            .join("\n");
        }
        if (relativePath.endsWith("aiToolRateLimitDecision.ts")) return "decideAiToolRateLimit";
        if (relativePath.endsWith("aiToolRateLimitArtifacts.ts")) return "buildAiToolRateLimitMatrix";
        if (relativePath.endsWith("aiToolPlanPolicy.ts")) return "rateLimitDecision\ndecideAiToolRateLimit";
        if (relativePath.endsWith("agentBffRouteShell.ts")) {
          return "rateLimitDecision\nmaxPayloadBytes\nmaxResultLimit";
        }
        if (relativePath.endsWith("searchCatalogTool.ts")) return "no rate decision here";
        if (relativePath.startsWith("src/features/ai/tools/")) return "decideAiToolRateLimit";
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(expect.arrayContaining(["tool_execution_bypasses_rate_policy"]));
  });
});
