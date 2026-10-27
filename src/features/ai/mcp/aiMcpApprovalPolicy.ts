import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiMcpApprovalMode = "safe_read" | "draft_only" | "approval_required";

export type AiMcpApprovalPolicy = {
  toolName: AiToolName;
  approvalMode: AiMcpApprovalMode;
  approvalRequired: boolean;
  idempotencyRequired: boolean;
  evidenceRequired: true;
  auditRequired: true;
  directExecutionAllowed: false;
  mutationWithoutApprovalAllowed: false;
  finalActionAllowedFromManifest: false;
};

export const AI_MCP_APPROVAL_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_mcp_approval_policy_v1",
  highRiskRequiresApproval: true,
  evidenceRequired: true,
  auditRequired: true,
  idempotencyRequiredForApproval: true,
  directExecutionAllowed: false,
  mutationWithoutApprovalAllowed: false,
  finalActionAllowedFromManifest: false,
});

function approvalModeForTool(toolName: AiToolName): AiMcpApprovalMode {
  const tool = getAiToolDefinition(toolName);
  if (tool?.approvalRequired || tool?.riskLevel === "approval_required") return "approval_required";
  if (tool?.riskLevel === "draft_only") return "draft_only";
  return "safe_read";
}

export function buildAiMcpApprovalPolicy(toolName: AiToolName): AiMcpApprovalPolicy {
  const tool = getAiToolDefinition(toolName);
  const approvalMode = approvalModeForTool(toolName);
  return {
    toolName,
    approvalMode,
    approvalRequired: approvalMode === "approval_required",
    idempotencyRequired: Boolean(tool?.idempotencyRequired),
    evidenceRequired: true,
    auditRequired: true,
    directExecutionAllowed: false,
    mutationWithoutApprovalAllowed: false,
    finalActionAllowedFromManifest: false,
  };
}

export function listAiMcpApprovalPolicies(): AiMcpApprovalPolicy[] {
  return AI_TOOL_NAMES.map(buildAiMcpApprovalPolicy);
}

export function validateAiMcpApprovalPolicies(): boolean {
  return listAiMcpApprovalPolicies().every((policy) => {
    if (policy.approvalMode === "approval_required") {
      return policy.approvalRequired && policy.idempotencyRequired;
    }
    return (
      policy.approvalRequired === false &&
      policy.directExecutionAllowed === false &&
      policy.mutationWithoutApprovalAllowed === false &&
      policy.finalActionAllowedFromManifest === false
    );
  });
}

export function buildAiMcpApprovalPolicyMatrix() {
  const policies = listAiMcpApprovalPolicies();
  return {
    policy_count: policies.length,
    approval_required_tools: policies.filter((policy) => policy.approvalRequired).map((policy) => policy.toolName),
    draft_only_tools: policies.filter((policy) => policy.approvalMode === "draft_only").map((policy) => policy.toolName),
    safe_read_tools: policies.filter((policy) => policy.approvalMode === "safe_read").map((policy) => policy.toolName),
    high_risk_requires_approval: policies
      .filter((policy) => policy.approvalMode === "approval_required")
      .every((policy) => policy.approvalRequired && policy.idempotencyRequired),
    mutation_without_approval_allowed: policies.some((policy) => policy.mutationWithoutApprovalAllowed),
    final_action_allowed_from_manifest: policies.some((policy) => policy.finalActionAllowedFromManifest),
    direct_execution_allowed: policies.some((policy) => policy.directExecutionAllowed),
    evidence_required: policies.every((policy) => policy.evidenceRequired),
    audit_required: policies.every((policy) => policy.auditRequired),
  };
}
