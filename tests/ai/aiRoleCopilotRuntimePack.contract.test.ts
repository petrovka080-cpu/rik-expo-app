import {
  AI_ROLE_COPILOT_REQUIRED_ROLES,
  buildAiRoleCopilotRuntime,
  buildAiRoleCopilotRuntimeMatrix,
  validateAiRoleCopilotPolicy,
} from "../../src/features/ai/roles/aiRoleCopilotRuntime";
import { getAiRoleCopilotProfile } from "../../src/features/ai/roles/aiRoleCopilotProfiles";

describe("AI role copilot runtime pack", () => {
  it("keeps required role profiles production-safe and tool-scoped", () => {
    const policy = validateAiRoleCopilotPolicy();

    expect(policy.ok).toBe(true);
    expect(policy.profilesRegistered).toBeGreaterThanOrEqual(7);
    expect(policy.requiredRolesCovered).toBe(true);
    expect(policy.allProfilesHaveDomains).toBe(true);
    expect(policy.allProfilesHaveKnownTools).toBe(true);
    expect(policy.allToolsRoleScoped).toBe(true);
    expect(policy.allHighRiskRequiresApproval).toBe(true);
    expect(policy.directExecutionWithoutApproval).toBe(false);
    expect(policy.contractorOwnRecordsOnly).toBe(true);
    expect(policy.developerControlFullAccess).toBe(true);
    expect(policy.roleIsolationE2eClaimed).toBe(false);
    expect(policy.mutationCount).toBe(0);
    expect(policy.dbWrites).toBe(0);
    expect(policy.externalLiveFetch).toBe(false);
    expect(policy.modelProviderChanged).toBe(false);
    expect(policy.gptEnabled).toBe(false);
    expect(policy.geminiRemoved).toBe(false);
  });

  it("builds a developer/control single-account runtime matrix without fake role isolation", () => {
    const matrix = buildAiRoleCopilotRuntimeMatrix({
      auth: { userId: "developer-control", role: "director" },
      developerControlSingleAccountMode: true,
    });

    expect(matrix.status).toBe("ready");
    expect(matrix.rolesChecked).toBe(AI_ROLE_COPILOT_REQUIRED_ROLES.length);
    expect(matrix.policyOk).toBe(true);
    expect(matrix.developerControlFullAccess).toBe(true);
    expect(matrix.roleIsolationE2eClaimed).toBe(false);
    expect(matrix.roleIsolationContractProof).toBe(true);
    expect(matrix.mutationCount).toBe(0);
    expect(matrix.dbWrites).toBe(0);
    expect(matrix.externalLiveFetch).toBe(false);
    expect(matrix.providerCalled).toBe(false);
    expect(matrix.fakeRoleIsolation).toBe(false);

    expect(matrix.results).toHaveLength(AI_ROLE_COPILOT_REQUIRED_ROLES.length);
    for (const result of matrix.results) {
      expect(result.status).toBe("ready");
      expect(result.runtimeMode).toBe("developer_control_profile_preview");
      expect(result.developerControlFullAccess).toBe(true);
      expect(result.roleIsolationE2eClaimed).toBe(false);
      expect(result.visibleTools.length).toBeGreaterThan(0);
      expect(result.visibleTools.every((tool) => tool.visible)).toBe(true);
      expect(result.visibleTools.every((tool) => tool.executable === false)).toBe(true);
      expect(result.directExecutionWithoutApproval).toBe(false);
      expect(result.unsafeDomainMutationAllowed).toBe(false);
      expect(result.fakeAiAnswer).toBe(false);
      expect(result.hardcodedAiResponse).toBe(false);
    }
  });

  it("preserves role-specific professional boundaries", () => {
    expect(getAiRoleCopilotProfile("director")).toMatchObject({
      documentAccessScope: "full_domain_redacted",
      developerControlFullAccess: true,
      roleIsolationE2eClaimed: false,
    });
    expect(getAiRoleCopilotProfile("control")).toMatchObject({
      documentAccessScope: "full_domain_redacted",
      developerControlFullAccess: true,
      roleIsolationE2eClaimed: false,
    });
    expect(getAiRoleCopilotProfile("contractor")).toMatchObject({
      documentAccessScope: "own_records_only",
      developerControlFullAccess: false,
      roleIsolationE2eClaimed: false,
    });

    expect(getAiRoleCopilotProfile("accountant")?.defaultTools).toContain("get_finance_summary");
    expect(getAiRoleCopilotProfile("accountant")?.defaultTools).not.toContain(
      "compare_suppliers",
    );
    expect(getAiRoleCopilotProfile("buyer")?.defaultTools).toContain("compare_suppliers");
    expect(getAiRoleCopilotProfile("warehouse")?.defaultTools).toContain(
      "get_warehouse_status",
    );
  });

  it("blocks cross-role profile access when developer/control preview mode is not active", () => {
    const blocked = buildAiRoleCopilotRuntime({
      auth: { userId: "buyer-user", role: "buyer" },
      targetRole: "accountant",
      developerControlSingleAccountMode: false,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.visibleTools).toHaveLength(0);
    expect(blocked.roleIsolationE2eClaimed).toBe(false);
    expect(blocked.blockedReason).toContain("Target role profile is not available");
  });
});
