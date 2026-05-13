import { AI_TOOL_NAMES, getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import {
  allAiToolsHaveRateLimitPolicy,
  getAiToolRateLimitPolicy,
  listAiToolRateLimitPolicies,
  validateAiToolRateLimitPolicy,
} from "../../src/features/ai/rateLimit/aiToolRateLimitPolicy";

describe("AI tool rate-limit policy", () => {
  it("registers a scoped rate policy for every AI tool", () => {
    expect(allAiToolsHaveRateLimitPolicy()).toBe(true);
    expect(listAiToolRateLimitPolicies()).toHaveLength(AI_TOOL_NAMES.length);

    for (const toolName of AI_TOOL_NAMES) {
      const policy = getAiToolRateLimitPolicy(toolName);
      const definition = getAiToolDefinition(toolName);

      expect(policy).not.toBeNull();
      expect(policy?.toolName).toBe(toolName);
      expect(policy?.rateLimitScope).toBe(`ai.tool.${toolName}`);
      expect(policy?.domain).toBe(definition?.domain);
      expect(policy?.riskLevel).toBe(definition?.riskLevel);
      expect(policy?.allowedRoles.length).toBeGreaterThan(0);
      expect(policy?.roleScoped).toBe(true);
      expect(policy?.actorScoped).toBe(true);
      expect(policy?.organizationScoped).toBe(true);
      expect(policy?.routeScoped).toBe(true);
    }
  });

  it("keeps every policy bounded and validation-clean", () => {
    for (const policy of listAiToolRateLimitPolicies()) {
      expect(validateAiToolRateLimitPolicy(policy)).toBe(true);
      expect(policy.maxRequestsPerMinute).toBeGreaterThan(0);
      expect(policy.burst).toBeLessThanOrEqual(policy.maxRequestsPerMinute);
      expect(policy.cooldownMs).toBeGreaterThan(0);
      expect(policy.maxRetriesPerRequest).toBeGreaterThanOrEqual(0);
      expect(policy.auditRequired).toBe(true);
      expect(policy.evidenceRequired).toBe(true);
      expect(policy.enforcementEnabledByDefault).toBe(false);
      expect(policy.externalStoreRequiredForLiveEnforcement).toBe(true);
    }
  });

  it("requires idempotency for approval-required tools", () => {
    const approvalPolicies = listAiToolRateLimitPolicies().filter(
      (policy) => policy.riskLevel === "approval_required",
    );

    expect(approvalPolicies.length).toBeGreaterThan(0);
    for (const policy of approvalPolicies) {
      expect(policy.idempotencyRequired).toBe(true);
      expect(policy.maxRetriesPerRequest).toBe(0);
    }
  });
});
