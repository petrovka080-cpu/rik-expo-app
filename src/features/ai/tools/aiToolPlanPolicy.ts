import type { AiActionAuditEventType } from "../audit/aiActionAuditTypes";
import { canUseAiCapability, type AiCapability, type AiDomain, type AiUserRole } from "../policy/aiRolePolicy";
import type { AiRiskLevel } from "../policy/aiRiskPolicy";
import {
  AI_SAFE_READ_TOOL_NAMES,
  getAiSafeReadToolBinding,
  type AiSafeReadToolBinding,
  type AiSafeReadToolName,
} from "./aiToolReadBindings";
import { AI_TOOL_NAMES, getAiToolDefinition } from "./aiToolRegistry";
import type { AiToolName } from "./aiToolTypes";

export type AiToolPlanMode =
  | "read_contract_plan"
  | "draft_only_plan"
  | "approval_gate_plan"
  | "blocked";

export type AiToolPlanBlockReason =
  | "tool_not_registered"
  | "role_not_required_for_tool"
  | "role_capability_denied"
  | "safe_read_binding_missing"
  | "forbidden_risk";

export type AiToolPlanRequest = {
  toolName: string;
  role: AiUserRole;
};

export type AiToolPlan = {
  toolName: string;
  role: AiUserRole;
  allowed: boolean;
  mode: AiToolPlanMode;
  riskLevel: AiRiskLevel;
  domain: AiDomain | "unknown";
  capability: AiCapability | null;
  approvalRequired: boolean;
  directExecutionEnabled: false;
  mutationAllowed: false;
  providerCallAllowed: false;
  dbAccessAllowed: false;
  rawRowsAllowed: false;
  rawPromptStorageAllowed: false;
  evidenceRequired: boolean;
  auditEvent: AiActionAuditEventType | null;
  rateLimitScope: string | null;
  cacheAllowed: boolean;
  readBinding: AiSafeReadToolBinding | null;
  blockReason: AiToolPlanBlockReason | null;
  reason: string;
};

function isAiToolName(toolName: string): toolName is AiToolName {
  return AI_TOOL_NAMES.some((registeredToolName) => registeredToolName === toolName);
}

export function isAiSafeReadToolName(toolName: AiToolName): toolName is AiSafeReadToolName {
  return AI_SAFE_READ_TOOL_NAMES.some((safeReadToolName) => safeReadToolName === toolName);
}

function getCapabilityForToolRisk(params: {
  toolName: AiToolName;
  riskLevel: AiRiskLevel;
}): AiCapability | null {
  if (params.riskLevel === "forbidden") return null;
  if (params.riskLevel === "draft_only") return "draft";
  if (params.riskLevel === "approval_required") return "submit_for_approval";
  if (params.toolName === "search_catalog") return "search";
  if (params.toolName === "compare_suppliers") return "compare";
  return "read_context";
}

function getModeForRisk(riskLevel: AiRiskLevel): AiToolPlanMode {
  if (riskLevel === "safe_read") return "read_contract_plan";
  if (riskLevel === "draft_only") return "draft_only_plan";
  if (riskLevel === "approval_required") return "approval_gate_plan";
  return "blocked";
}

function canPlanScopedWarehouseStatus(params: {
  toolName: AiToolName;
  role: AiUserRole;
  capability: AiCapability | null;
}): boolean {
  return (
    params.toolName === "get_warehouse_status" &&
    params.capability === "read_context" &&
    (params.role === "foreman" || params.role === "buyer")
  );
}

function blockedPlan(params: {
  toolName: string;
  role: AiUserRole;
  riskLevel?: AiRiskLevel;
  domain?: AiDomain;
  capability?: AiCapability | null;
  evidenceRequired?: boolean;
  auditEvent?: AiActionAuditEventType | null;
  rateLimitScope?: string | null;
  cacheAllowed?: boolean;
  readBinding?: AiSafeReadToolBinding | null;
  blockReason: AiToolPlanBlockReason;
  reason: string;
}): AiToolPlan {
  return {
    toolName: params.toolName,
    role: params.role,
    allowed: false,
    mode: "blocked",
    riskLevel: params.riskLevel ?? "forbidden",
    domain: params.domain ?? "unknown",
    capability: params.capability ?? null,
    approvalRequired: false,
    directExecutionEnabled: false,
    mutationAllowed: false,
    providerCallAllowed: false,
    dbAccessAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: params.evidenceRequired ?? true,
    auditEvent: params.auditEvent ?? null,
    rateLimitScope: params.rateLimitScope ?? null,
    cacheAllowed: params.cacheAllowed ?? false,
    readBinding: params.readBinding ?? null,
    blockReason: params.blockReason,
    reason: params.reason,
  };
}

export function planAiToolUse(request: AiToolPlanRequest): AiToolPlan {
  if (!isAiToolName(request.toolName)) {
    return blockedPlan({
      toolName: request.toolName,
      role: request.role,
      blockReason: "tool_not_registered",
      reason: `AI tool is not registered: ${request.toolName}`,
    });
  }

  const tool = getAiToolDefinition(request.toolName);
  if (!tool) {
    return blockedPlan({
      toolName: request.toolName,
      role: request.role,
      blockReason: "tool_not_registered",
      reason: `AI tool definition is missing: ${request.toolName}`,
    });
  }

  const capability = getCapabilityForToolRisk({
    toolName: tool.name,
    riskLevel: tool.riskLevel,
  });
  const readBinding =
    tool.riskLevel === "safe_read" && isAiSafeReadToolName(tool.name)
      ? getAiSafeReadToolBinding(tool.name)
      : null;

  if (tool.riskLevel === "forbidden") {
    return blockedPlan({
      toolName: tool.name,
      role: request.role,
      riskLevel: tool.riskLevel,
      domain: tool.domain,
      capability,
      evidenceRequired: tool.evidenceRequired,
      auditEvent: tool.auditEvent,
      rateLimitScope: tool.rateLimitScope,
      cacheAllowed: tool.cacheAllowed,
      readBinding,
      blockReason: "forbidden_risk",
      reason: `AI tool is forbidden by risk policy: ${tool.name}`,
    });
  }

  if (!tool.requiredRoles.includes(request.role)) {
    return blockedPlan({
      toolName: tool.name,
      role: request.role,
      riskLevel: tool.riskLevel,
      domain: tool.domain,
      capability,
      evidenceRequired: tool.evidenceRequired,
      auditEvent: tool.auditEvent,
      rateLimitScope: tool.rateLimitScope,
      cacheAllowed: tool.cacheAllowed,
      readBinding,
      blockReason: "role_not_required_for_tool",
      reason: `AI role ${request.role} is not listed for tool ${tool.name}`,
    });
  }

  if (
    !canPlanScopedWarehouseStatus({ toolName: tool.name, role: request.role, capability }) &&
    (!capability ||
      !canUseAiCapability({
        role: request.role,
        domain: tool.domain,
        capability,
        viaApprovalGate: false,
      }))
  ) {
    return blockedPlan({
      toolName: tool.name,
      role: request.role,
      riskLevel: tool.riskLevel,
      domain: tool.domain,
      capability,
      evidenceRequired: tool.evidenceRequired,
      auditEvent: tool.auditEvent,
      rateLimitScope: tool.rateLimitScope,
      cacheAllowed: tool.cacheAllowed,
      readBinding,
      blockReason: "role_capability_denied",
      reason: `AI role ${request.role} cannot plan ${capability ?? "unknown"} for ${tool.domain}`,
    });
  }

  if (tool.riskLevel === "safe_read" && !readBinding) {
    return blockedPlan({
      toolName: tool.name,
      role: request.role,
      riskLevel: tool.riskLevel,
      domain: tool.domain,
      capability,
      evidenceRequired: tool.evidenceRequired,
      auditEvent: tool.auditEvent,
      rateLimitScope: tool.rateLimitScope,
      cacheAllowed: tool.cacheAllowed,
      readBinding,
      blockReason: "safe_read_binding_missing",
      reason: `AI safe-read tool has no read contract binding: ${tool.name}`,
    });
  }

  return {
    toolName: tool.name,
    role: request.role,
    allowed: true,
    mode: getModeForRisk(tool.riskLevel),
    riskLevel: tool.riskLevel,
    domain: tool.domain,
    capability,
    approvalRequired: tool.approvalRequired,
    directExecutionEnabled: false,
    mutationAllowed: false,
    providerCallAllowed: false,
    dbAccessAllowed: false,
    rawRowsAllowed: false,
    rawPromptStorageAllowed: false,
    evidenceRequired: tool.evidenceRequired,
    auditEvent: tool.auditEvent,
    rateLimitScope: tool.rateLimitScope,
    cacheAllowed: tool.cacheAllowed,
    readBinding,
    blockReason: null,
    reason: "AI tool use can be planned inside policy boundaries only",
  };
}
