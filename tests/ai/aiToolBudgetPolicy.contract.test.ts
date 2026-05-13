import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";
import {
  allAiToolsHaveBudgetPolicy,
  getAiToolBudgetPolicy,
  listAiToolBudgetPolicies,
  validateAiToolBudgetPolicy,
} from "../../src/features/ai/rateLimit/aiToolBudgetPolicy";

describe("AI tool budget policy", () => {
  it("registers a bounded budget for every AI tool", () => {
    expect(allAiToolsHaveBudgetPolicy()).toBe(true);
    expect(listAiToolBudgetPolicies()).toHaveLength(AI_TOOL_NAMES.length);

    for (const toolName of AI_TOOL_NAMES) {
      const policy = getAiToolBudgetPolicy(toolName);

      expect(policy).not.toBeNull();
      expect(policy?.maxPayloadBytes).toBeGreaterThan(0);
      expect(policy?.maxResultLimit).toBeGreaterThan(0);
      expect(policy?.defaultResultLimit).toBeLessThanOrEqual(policy?.maxResultLimit ?? 0);
      expect(policy?.maxInputItems).toBeGreaterThan(0);
      expect(policy?.maxEvidenceRefs).toBeGreaterThan(0);
      expect(policy?.unlimitedRetriesAllowed).toBe(false);
      expect(policy?.boundedRequestRequired).toBe(true);
    }
  });

  it("keeps policy validation clean and retries bounded", () => {
    for (const policy of listAiToolBudgetPolicies()) {
      expect(validateAiToolBudgetPolicy(policy)).toBe(true);
      expect(policy.maxRetriesPerRequest).toBeGreaterThanOrEqual(0);
      expect(policy.maxRetriesPerRequest).toBeLessThanOrEqual(1);
    }
  });

  it("caps expensive tools to production-safe result limits", () => {
    expect(getAiToolBudgetPolicy("search_catalog")?.maxResultLimit).toBeLessThanOrEqual(20);
    expect(getAiToolBudgetPolicy("compare_suppliers")?.maxResultLimit).toBeLessThanOrEqual(10);
    expect(getAiToolBudgetPolicy("submit_for_approval")?.maxResultLimit).toBe(1);
    expect(getAiToolBudgetPolicy("submit_for_approval")?.idempotencyRequired).toBe(true);
  });
});
