import type { AiCapability } from "../policy/aiRolePolicy";
import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolJsonObjectSchema, AiToolName } from "../tools/aiToolTypes";
import { buildAiMcpApprovalPolicy, type AiMcpApprovalMode } from "./aiMcpApprovalPolicy";
import { buildAiMcpSecurityPolicy } from "./aiMcpSecurityPolicy";

export type AiMcpCapabilityKind =
  | "safe_read"
  | "draft_preview"
  | "approval_submission"
  | "status_read";

export type AiMcpCapabilitySchema = {
  toolName: AiToolName;
  capabilityKind: AiMcpCapabilityKind;
  aiCapability: AiCapability;
  approvalMode: AiMcpApprovalMode;
  routeScope: string;
  inputSchema: AiToolJsonObjectSchema;
  outputSchema: AiToolJsonObjectSchema;
  inputDtoOnly: true;
  outputDtoOnly: true;
  evidenceRefsRequired: true;
  blockedReasonAllowed: true;
  redactionRequired: true;
  roleScopeRequired: true;
  approvalPolicyRequired: true;
  securityPolicyRequired: true;
  directExecutionAllowed: false;
  externalHostExecutionAllowed: false;
};

export const AI_MCP_CAPABILITY_SCHEMA_CONTRACT = Object.freeze({
  contractId: "ai_mcp_capability_schema_v1",
  inputDtoOnly: true,
  outputDtoOnly: true,
  evidenceRefsRequired: true,
  blockedReasonAllowed: true,
  redactionRequired: true,
  roleScopeRequired: true,
  approvalPolicyRequired: true,
  securityPolicyRequired: true,
  directExecutionAllowed: false,
  externalHostExecutionAllowed: false,
});

function capabilityKindForTool(toolName: AiToolName): AiMcpCapabilityKind {
  if (toolName === "submit_for_approval") return "approval_submission";
  if (toolName === "get_action_status") return "status_read";
  const approval = buildAiMcpApprovalPolicy(toolName);
  if (approval.approvalMode === "draft_only") return "draft_preview";
  return "safe_read";
}

function aiCapabilityForTool(toolName: AiToolName): AiCapability {
  switch (toolName) {
    case "search_catalog":
      return "search";
    case "compare_suppliers":
      return "compare";
    case "draft_request":
    case "draft_report":
    case "draft_act":
      return "draft";
    case "submit_for_approval":
      return "submit_for_approval";
    default:
      return "read_context";
  }
}

export function buildAiMcpCapabilitySchema(toolName: AiToolName): AiMcpCapabilitySchema {
  const tool = getAiToolDefinition(toolName);
  if (!tool) {
    throw new Error(`AI MCP capability schema cannot be built for unregistered tool: ${toolName}`);
  }
  const security = buildAiMcpSecurityPolicy(toolName);
  const approval = buildAiMcpApprovalPolicy(toolName);

  return {
    toolName,
    capabilityKind: capabilityKindForTool(toolName),
    aiCapability: aiCapabilityForTool(toolName),
    approvalMode: approval.approvalMode,
    routeScope: security.routeScope,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    inputDtoOnly: true,
    outputDtoOnly: true,
    evidenceRefsRequired: true,
    blockedReasonAllowed: true,
    redactionRequired: true,
    roleScopeRequired: true,
    approvalPolicyRequired: true,
    securityPolicyRequired: true,
    directExecutionAllowed: false,
    externalHostExecutionAllowed: false,
  };
}

export function listAiMcpCapabilitySchemas(): AiMcpCapabilitySchema[] {
  return AI_TOOL_NAMES.map(buildAiMcpCapabilitySchema);
}

export function validateAiMcpCapabilitySchemas(): boolean {
  return listAiMcpCapabilitySchemas().every(
    (schema) =>
      schema.inputSchema.type === "object" &&
      schema.outputSchema.type === "object" &&
      schema.inputDtoOnly &&
      schema.outputDtoOnly &&
      schema.evidenceRefsRequired &&
      schema.redactionRequired &&
      schema.roleScopeRequired &&
      schema.approvalPolicyRequired &&
      schema.securityPolicyRequired &&
      schema.directExecutionAllowed === false &&
      schema.externalHostExecutionAllowed === false,
  );
}

export function buildAiMcpCapabilitySchemaMatrix() {
  const schemas = listAiMcpCapabilitySchemas();
  return {
    schema_count: schemas.length,
    all_tools_have_capability_schema: schemas.length === AI_TOOL_NAMES.length,
    all_inputs_dto_only: schemas.every((schema) => schema.inputDtoOnly),
    all_outputs_dto_only: schemas.every((schema) => schema.outputDtoOnly),
    evidence_refs_required: schemas.every((schema) => schema.evidenceRefsRequired),
    redaction_required: schemas.every((schema) => schema.redactionRequired),
    role_scope_required: schemas.every((schema) => schema.roleScopeRequired),
    approval_policy_required: schemas.every((schema) => schema.approvalPolicyRequired),
    security_policy_required: schemas.every((schema) => schema.securityPolicyRequired),
    direct_execution_allowed: schemas.some((schema) => schema.directExecutionAllowed),
    external_host_execution_allowed: schemas.some((schema) => schema.externalHostExecutionAllowed),
  };
}
