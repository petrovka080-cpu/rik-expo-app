import type { AiUserRole } from "../policy/aiRolePolicy";
import { getAiToolBudgetPolicy } from "../rateLimit/aiToolBudgetPolicy";
import { getAiToolRateLimitPolicy } from "../rateLimit/aiToolRateLimitPolicy";
import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  hasForbiddenAiToolTransportKeys,
  listAiToolTransportContracts,
  type AiToolTransportBoundaryKind,
} from "../tools/transport/aiToolTransportTypes";
import { buildAiMcpApprovalPolicy } from "./aiMcpApprovalPolicy";

export type AiMcpSecurityPolicy = {
  toolName: AiToolName;
  routeScope: string;
  transportBoundary: AiToolTransportBoundaryKind;
  allowedRoles: readonly AiUserRole[];
  maxPayloadBytes: number;
  maxResultLimit: number;
  maxRequestsPerMinute: number;
  boundedRequestRequired: true;
  dtoOnly: true;
  redactionRequired: true;
  evidenceRequired: true;
  auditRequired: true;
  idempotencyRequired: boolean;
  roleScopeRequired: true;
  directUiMutationAllowed: false;
  directDatabaseAccessAllowed: false;
  externalHostExecutionAllowed: false;
  modelProviderInvocationAllowed: false;
  privilegedBackendRoleAllowed: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  secretsReturned: false;
};

export type AiMcpSecurityEvaluation = {
  allowed: boolean;
  reason:
    | "allowed"
    | "unknown_tool"
    | "role_not_allowed"
    | "forbidden_payload_key"
    | "payload_too_large"
    | "result_limit_exceeded"
    | "idempotency_required"
    | "evidence_required";
  toolName: string;
  redactionRequired: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessed: false;
};

export const AI_MCP_SECURITY_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_mcp_security_policy_v1",
  boundedRequestRequired: true,
  dtoOnly: true,
  redactionRequired: true,
  evidenceRequired: true,
  auditRequired: true,
  roleScopeRequired: true,
  directUiMutationAllowed: false,
  directDatabaseAccessAllowed: false,
  externalHostExecutionAllowed: false,
  modelProviderInvocationAllowed: false,
  privilegedBackendRoleAllowed: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  secretsReturned: false,
});

function measurePayloadBytes(payload: unknown): number {
  try {
    return JSON.stringify(payload ?? {}).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildAiMcpSecurityPolicy(toolName: AiToolName): AiMcpSecurityPolicy {
  const tool = getAiToolDefinition(toolName);
  const transport = listAiToolTransportContracts().find((entry) => entry.toolName === toolName);
  const budget = getAiToolBudgetPolicy(toolName);
  const rate = getAiToolRateLimitPolicy(toolName);
  const approval = buildAiMcpApprovalPolicy(toolName);

  if (!tool || !transport || !budget || !rate) {
    throw new Error(`AI MCP security policy cannot be built for unregistered tool: ${toolName}`);
  }

  return {
    toolName,
    routeScope: transport.routeScope,
    transportBoundary: transport.boundary,
    allowedRoles: tool.requiredRoles,
    maxPayloadBytes: budget.maxPayloadBytes,
    maxResultLimit: budget.maxResultLimit,
    maxRequestsPerMinute: rate.maxRequestsPerMinute,
    boundedRequestRequired: true,
    dtoOnly: true,
    redactionRequired: true,
    evidenceRequired: true,
    auditRequired: true,
    idempotencyRequired: approval.idempotencyRequired,
    roleScopeRequired: true,
    directUiMutationAllowed: false,
    directDatabaseAccessAllowed: false,
    externalHostExecutionAllowed: false,
    modelProviderInvocationAllowed: false,
    privilegedBackendRoleAllowed: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    secretsReturned: false,
  };
}

export function listAiMcpSecurityPolicies(): AiMcpSecurityPolicy[] {
  return AI_TOOL_NAMES.map(buildAiMcpSecurityPolicy);
}

export function evaluateAiMcpSecurityPolicy(params: {
  toolName: string;
  role: AiUserRole;
  payload?: unknown;
  requestedLimit?: number | null;
  evidenceRefs?: readonly string[] | null;
  idempotencyKey?: string | null;
}): AiMcpSecurityEvaluation {
  if (!AI_TOOL_NAMES.some((toolName) => toolName === params.toolName)) {
    return {
      allowed: false,
      reason: "unknown_tool",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }

  const policy = buildAiMcpSecurityPolicy(params.toolName as AiToolName);
  if (!policy.allowedRoles.includes(params.role)) {
    return {
      allowed: false,
      reason: "role_not_allowed",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }
  if (hasForbiddenAiToolTransportKeys(params.payload ?? {})) {
    return {
      allowed: false,
      reason: "forbidden_payload_key",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }
  if (measurePayloadBytes(params.payload) > policy.maxPayloadBytes) {
    return {
      allowed: false,
      reason: "payload_too_large",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }
  if (
    typeof params.requestedLimit === "number" &&
    Number.isFinite(params.requestedLimit) &&
    params.requestedLimit > policy.maxResultLimit
  ) {
    return {
      allowed: false,
      reason: "result_limit_exceeded",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }
  if (policy.idempotencyRequired && !hasText(params.idempotencyKey)) {
    return {
      allowed: false,
      reason: "idempotency_required",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }
  if ((params.evidenceRefs ?? []).length === 0) {
    return {
      allowed: false,
      reason: "evidence_required",
      toolName: params.toolName,
      redactionRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    };
  }

  return {
    allowed: true,
    reason: "allowed",
    toolName: params.toolName,
    redactionRequired: true,
    mutationCount: 0,
    providerCalled: false,
    dbAccessed: false,
  };
}

export function buildAiMcpSecurityPolicyMatrix() {
  const policies = listAiMcpSecurityPolicies();
  return {
    policy_count: policies.length,
    all_tools_have_security_policy: policies.length === AI_TOOL_NAMES.length,
    all_tools_role_scoped: policies.every((policy) => policy.roleScopeRequired && policy.allowedRoles.length > 0),
    all_tools_bounded: policies.every((policy) => policy.boundedRequestRequired),
    all_tools_dto_only: policies.every((policy) => policy.dtoOnly),
    all_tools_redacted: policies.every((policy) => policy.redactionRequired),
    all_tools_have_budget: policies.every((policy) => policy.maxPayloadBytes > 0 && policy.maxResultLimit > 0),
    all_tools_have_rate_budget: policies.every((policy) => policy.maxRequestsPerMinute > 0),
    direct_ui_mutation_allowed: policies.some((policy) => policy.directUiMutationAllowed),
    direct_database_access_allowed: policies.some((policy) => policy.directDatabaseAccessAllowed),
    external_host_execution_allowed: policies.some((policy) => policy.externalHostExecutionAllowed),
    model_provider_invocation_allowed: policies.some((policy) => policy.modelProviderInvocationAllowed),
    privileged_backend_role_allowed: policies.some((policy) => policy.privilegedBackendRoleAllowed),
    raw_rows_returned: policies.some((policy) => policy.rawRowsReturned),
    raw_prompt_returned: policies.some((policy) => policy.rawPromptReturned),
    raw_provider_payload_returned: policies.some((policy) => policy.rawProviderPayloadReturned),
    secrets_returned: policies.some((policy) => policy.secretsReturned),
  };
}
