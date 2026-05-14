import {
  AI_MCP_APPROVAL_POLICY_CONTRACT,
  buildAiMcpApprovalPolicyMatrix,
  listAiMcpApprovalPolicies,
  validateAiMcpApprovalPolicies,
} from "../../src/features/ai/mcp/aiMcpApprovalPolicy";

describe("AI MCP approval policy", () => {
  it("keeps high-risk tools approval-only and disables final execution from manifest", () => {
    const policies = listAiMcpApprovalPolicies();
    const matrix = buildAiMcpApprovalPolicyMatrix();

    expect(AI_MCP_APPROVAL_POLICY_CONTRACT).toMatchObject({
      contractId: "ai_mcp_approval_policy_v1",
      highRiskRequiresApproval: true,
      evidenceRequired: true,
      auditRequired: true,
      idempotencyRequiredForApproval: true,
      directExecutionAllowed: false,
      mutationWithoutApprovalAllowed: false,
      finalActionAllowedFromManifest: false,
    });
    expect(validateAiMcpApprovalPolicies()).toBe(true);
    expect(matrix).toMatchObject({
      policy_count: 9,
      approval_required_tools: ["submit_for_approval"],
      draft_only_tools: ["draft_request", "draft_report", "draft_act"],
      high_risk_requires_approval: true,
      mutation_without_approval_allowed: false,
      final_action_allowed_from_manifest: false,
      direct_execution_allowed: false,
      evidence_required: true,
      audit_required: true,
    });
    expect(policies.find((policy) => policy.toolName === "submit_for_approval")).toMatchObject({
      approvalRequired: true,
      idempotencyRequired: true,
      directExecutionAllowed: false,
      mutationWithoutApprovalAllowed: false,
    });
  });
});
