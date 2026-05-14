import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import { buildAiMcpApprovalPolicy, type AiMcpApprovalMode } from "./aiMcpApprovalPolicy";
import { buildAiMcpCapabilitySchema, type AiMcpCapabilityKind } from "./aiMcpCapabilitySchema";
import { buildAiMcpSecurityPolicy } from "./aiMcpSecurityPolicy";

export type AiMcpToolManifestEntry = {
  toolName: AiToolName;
  title: string;
  description: string;
  domain: string;
  capabilityKind: AiMcpCapabilityKind;
  approvalMode: AiMcpApprovalMode;
  routeScope: string;
  requiredRoles: readonly string[];
  inputSchemaRef: string;
  outputSchemaRef: string;
  securityPolicyId: "ai_mcp_security_policy_v1";
  approvalPolicyId: "ai_mcp_approval_policy_v1";
  capabilitySchemaId: "ai_mcp_capability_schema_v1";
  boundedRequestRequired: true;
  dtoOnly: true;
  redactionRequired: true;
  evidenceRequired: true;
  auditRequired: true;
  idempotencyRequired: boolean;
  safeReadOnly: boolean;
  draftOnly: boolean;
  approvalRequired: boolean;
  finalActionAllowed: false;
  mutationWithoutApprovalAllowed: false;
  directUiMutationAllowed: false;
  externalHostExecutionAllowed: false;
  modelProviderInvocationAllowed: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  secretsReturned: false;
};

export const AI_MCP_TOOL_MANIFEST_CONTRACT = Object.freeze({
  contractId: "ai_mcp_tool_manifest_v1",
  manifestVersion: 1,
  providerNeutral: true,
  toolsFromRegistryOnly: true,
  securityPolicyRequired: true,
  approvalPolicyRequired: true,
  capabilitySchemaRequired: true,
  noLiveModelCall: true,
  noExternalHostExecution: true,
  noMutationWithoutApproval: true,
  noDirectUiMutation: true,
  noRawRows: true,
  noRawPrompt: true,
  noRawProviderPayload: true,
  noSecrets: true,
});

function titleForTool(toolName: AiToolName): string {
  return toolName
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildAiMcpToolManifestEntry(toolName: AiToolName): AiMcpToolManifestEntry {
  const tool = getAiToolDefinition(toolName);
  if (!tool) {
    throw new Error(`AI MCP manifest cannot be built for unregistered tool: ${toolName}`);
  }
  const approval = buildAiMcpApprovalPolicy(toolName);
  const capability = buildAiMcpCapabilitySchema(toolName);
  const security = buildAiMcpSecurityPolicy(toolName);

  return {
    toolName,
    title: titleForTool(toolName),
    description: tool.description,
    domain: tool.domain,
    capabilityKind: capability.capabilityKind,
    approvalMode: approval.approvalMode,
    routeScope: security.routeScope,
    requiredRoles: tool.requiredRoles,
    inputSchemaRef: `${toolName}.input`,
    outputSchemaRef: `${toolName}.output`,
    securityPolicyId: "ai_mcp_security_policy_v1",
    approvalPolicyId: "ai_mcp_approval_policy_v1",
    capabilitySchemaId: "ai_mcp_capability_schema_v1",
    boundedRequestRequired: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRequired: true,
    auditRequired: true,
    idempotencyRequired: approval.idempotencyRequired,
    safeReadOnly: approval.approvalMode === "safe_read",
    draftOnly: approval.approvalMode === "draft_only",
    approvalRequired: approval.approvalRequired,
    finalActionAllowed: false,
    mutationWithoutApprovalAllowed: false,
    directUiMutationAllowed: false,
    externalHostExecutionAllowed: false,
    modelProviderInvocationAllowed: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    secretsReturned: false,
  };
}

export function listAiMcpToolManifestEntries(): AiMcpToolManifestEntry[] {
  return AI_TOOL_NAMES.map(buildAiMcpToolManifestEntry);
}

export function validateAiMcpToolManifest(): boolean {
  const entries = listAiMcpToolManifestEntries();
  return (
    entries.length === AI_TOOL_NAMES.length &&
    AI_TOOL_NAMES.every((toolName) => entries.some((entry) => entry.toolName === toolName)) &&
    entries.every(
      (entry) =>
        entry.boundedRequestRequired &&
        entry.dtoOnly &&
        entry.redactionRequired &&
        entry.evidenceRequired &&
        entry.auditRequired &&
        entry.requiredRoles.length > 0 &&
        entry.securityPolicyId === "ai_mcp_security_policy_v1" &&
        entry.approvalPolicyId === "ai_mcp_approval_policy_v1" &&
        entry.capabilitySchemaId === "ai_mcp_capability_schema_v1" &&
        entry.finalActionAllowed === false &&
        entry.mutationWithoutApprovalAllowed === false &&
        entry.directUiMutationAllowed === false &&
        entry.externalHostExecutionAllowed === false &&
        entry.modelProviderInvocationAllowed === false &&
        entry.rawRowsReturned === false &&
        entry.rawPromptReturned === false &&
        entry.rawProviderPayloadReturned === false &&
        entry.secretsReturned === false,
    )
  );
}

export function buildAiMcpToolManifestMatrix() {
  const entries = listAiMcpToolManifestEntries();
  return {
    manifest_status: validateAiMcpToolManifest() ? "ready" : "blocked",
    manifest_version: AI_MCP_TOOL_MANIFEST_CONTRACT.manifestVersion,
    tool_count: entries.length,
    registry_tool_count: AI_TOOL_NAMES.length,
    all_tools_from_registry: AI_TOOL_NAMES.every((toolName) =>
      entries.some((entry) => entry.toolName === toolName),
    ),
    all_tools_have_security_policy: entries.every(
      (entry) => entry.securityPolicyId === "ai_mcp_security_policy_v1",
    ),
    all_tools_have_approval_policy: entries.every(
      (entry) => entry.approvalPolicyId === "ai_mcp_approval_policy_v1",
    ),
    all_tools_have_capability_schema: entries.every(
      (entry) => entry.capabilitySchemaId === "ai_mcp_capability_schema_v1",
    ),
    all_tools_role_scoped: entries.every((entry) => entry.requiredRoles.length > 0),
    all_tools_evidence_required: entries.every((entry) => entry.evidenceRequired),
    all_tools_redacted: entries.every((entry) => entry.redactionRequired),
    approval_required_tools: entries.filter((entry) => entry.approvalRequired).map((entry) => entry.toolName),
    draft_only_tools: entries.filter((entry) => entry.draftOnly).map((entry) => entry.toolName),
    safe_read_tools: entries.filter((entry) => entry.safeReadOnly).map((entry) => entry.toolName),
    final_action_allowed: entries.some((entry) => entry.finalActionAllowed),
    mutation_without_approval_allowed: entries.some((entry) => entry.mutationWithoutApprovalAllowed),
    direct_ui_mutation_allowed: entries.some((entry) => entry.directUiMutationAllowed),
    external_host_execution_allowed: entries.some((entry) => entry.externalHostExecutionAllowed),
    model_provider_invocation_allowed: entries.some((entry) => entry.modelProviderInvocationAllowed),
    raw_rows_returned: entries.some((entry) => entry.rawRowsReturned),
    raw_prompt_returned: entries.some((entry) => entry.rawPromptReturned),
    raw_provider_payload_returned: entries.some((entry) => entry.rawProviderPayloadReturned),
    secrets_returned: entries.some((entry) => entry.secretsReturned),
  };
}
