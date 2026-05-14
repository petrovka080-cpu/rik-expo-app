import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  type AgentBffRouteDefinition,
  type AgentBffRouteOperation,
} from "./agentBffRouteShell";
import {
  allAiToolsHaveBudgetPolicy,
  getAiToolBudgetPolicy,
  listAiToolBudgetPolicies,
} from "../rateLimit/aiToolBudgetPolicy";
import { getAiToolRateLimitPolicy } from "../rateLimit/aiToolRateLimitPolicy";
import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";

export type AgentRuntimeRouteClass =
  | "read"
  | "preview"
  | "draft"
  | "approval_ledger"
  | "approved_executor"
  | "tool_registry";

export type AgentRuntimeEvidencePolicy =
  | "required"
  | "optional_or_blocked_reason";

export type AgentRuntimeRouteBudgetPolicy = {
  operation: AgentBffRouteOperation;
  endpoint: string;
  method: AgentBffRouteDefinition["method"];
  routeClass: AgentRuntimeRouteClass;
  routeScope: string;
  maxRequestsPerMinute: number;
  burst: number;
  maxPayloadBytes: number;
  maxResultLimit: number;
  timeoutMs: number;
  maxEvidenceRefs: number;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  evidencePolicy: AgentRuntimeEvidencePolicy;
  evidenceOrBlockedReasonRequired: true;
  boundedRequestRequired: true;
  payloadLimitRequired: true;
  resultLimitRequired: true;
  timeoutRequired: true;
  routeScoped: true;
};

const ROUTE_CLASS_DEFAULTS: Record<
  AgentRuntimeRouteClass,
  Omit<
    AgentRuntimeRouteBudgetPolicy,
    | "operation"
    | "endpoint"
    | "method"
    | "routeClass"
    | "routeScope"
    | "idempotencyRequired"
    | "auditRequired"
    | "evidencePolicy"
  >
> = {
  read: {
    maxRequestsPerMinute: 60,
    burst: 20,
    maxPayloadBytes: 4_096,
    maxResultLimit: 50,
    timeoutMs: 1_500,
    maxEvidenceRefs: 40,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
  preview: {
    maxRequestsPerMinute: 30,
    burst: 10,
    maxPayloadBytes: 8_192,
    maxResultLimit: 20,
    timeoutMs: 2_500,
    maxEvidenceRefs: 60,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
  draft: {
    maxRequestsPerMinute: 20,
    burst: 5,
    maxPayloadBytes: 12_288,
    maxResultLimit: 5,
    timeoutMs: 3_500,
    maxEvidenceRefs: 80,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
  approval_ledger: {
    maxRequestsPerMinute: 12,
    burst: 4,
    maxPayloadBytes: 8_192,
    maxResultLimit: 5,
    timeoutMs: 5_000,
    maxEvidenceRefs: 40,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
  approved_executor: {
    maxRequestsPerMinute: 6,
    burst: 2,
    maxPayloadBytes: 8_192,
    maxResultLimit: 3,
    timeoutMs: 8_000,
    maxEvidenceRefs: 40,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
  tool_registry: {
    maxRequestsPerMinute: 90,
    burst: 30,
    maxPayloadBytes: 4_096,
    maxResultLimit: 20,
    timeoutMs: 1_000,
    maxEvidenceRefs: 20,
    evidenceOrBlockedReasonRequired: true,
    boundedRequestRequired: true,
    payloadLimitRequired: true,
    resultLimitRequired: true,
    timeoutRequired: true,
    routeScoped: true,
  },
};

function classifyAgentRuntimeRoute(operation: AgentBffRouteOperation): AgentRuntimeRouteClass {
  if (operation.startsWith("agent.tools.")) return "tool_registry";
  if (operation.includes("execute_approved")) return "approved_executor";
  if (operation.startsWith("agent.action.") || operation.startsWith("agent.approval_inbox.")) {
    return "approval_ledger";
  }
  if (operation.includes("draft")) return "draft";
  if (
    operation.includes("preview") ||
    operation.includes("action_plan") ||
    operation.includes("plan") ||
    operation.includes("compare")
  ) {
    return "preview";
  }
  return "read";
}

function operationRequiresIdempotency(operation: AgentBffRouteOperation): boolean {
  return operation.includes("submit_for_approval") || operation.includes("execute_approved");
}

function operationRequiresAudit(operation: AgentBffRouteOperation): boolean {
  return (
    operation.startsWith("agent.action.") ||
    operation.startsWith("agent.approval_inbox.") ||
    operation.includes("submit_for_approval") ||
    operation.includes("draft")
  );
}

function operationEvidencePolicy(operation: AgentBffRouteOperation): AgentRuntimeEvidencePolicy {
  return operation.startsWith("agent.tools.") ? "optional_or_blocked_reason" : "required";
}

export function buildAgentRuntimeRouteBudgetPolicy(
  route: AgentBffRouteDefinition,
): AgentRuntimeRouteBudgetPolicy {
  const routeClass = classifyAgentRuntimeRoute(route.operation);
  return {
    operation: route.operation,
    endpoint: route.endpoint,
    method: route.method,
    routeClass,
    routeScope: route.operation,
    ...ROUTE_CLASS_DEFAULTS[routeClass],
    idempotencyRequired: operationRequiresIdempotency(route.operation),
    auditRequired: operationRequiresAudit(route.operation),
    evidencePolicy: operationEvidencePolicy(route.operation),
  };
}

export function listAgentRuntimeRouteBudgetPolicies(): AgentRuntimeRouteBudgetPolicy[] {
  return AGENT_BFF_ROUTE_DEFINITIONS.map(buildAgentRuntimeRouteBudgetPolicy);
}

export function getAgentRuntimeRouteBudgetPolicy(
  operation: AgentBffRouteOperation,
): AgentRuntimeRouteBudgetPolicy | null {
  return listAgentRuntimeRouteBudgetPolicies().find((policy) => policy.operation === operation) ?? null;
}

export function getAgentRuntimeToolBudget(toolName: AiToolName) {
  return getAiToolBudgetPolicy(toolName);
}

export function allAgentRuntimeRoutesHaveBudgetPolicy(): boolean {
  const policies = listAgentRuntimeRouteBudgetPolicies();
  return (
    policies.length === AGENT_BFF_ROUTE_DEFINITIONS.length &&
    AGENT_BFF_ROUTE_DEFINITIONS.every((route) =>
      policies.some((policy) => policy.operation === route.operation),
    )
  );
}

export function allAgentRuntimeToolsHaveBudgetAndRatePolicy(): boolean {
  return (
    allAiToolsHaveBudgetPolicy() &&
    AI_TOOL_NAMES.every((toolName) => Boolean(getAiToolRateLimitPolicy(toolName)))
  );
}

export function buildAgentRuntimeBudgetPolicyMatrix() {
  const routePolicies = listAgentRuntimeRouteBudgetPolicies();
  const toolBudgets = listAiToolBudgetPolicies();

  return {
    route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
    route_budget_count: routePolicies.length,
    all_routes_have_budget: allAgentRuntimeRoutesHaveBudgetPolicy(),
    all_routes_have_payload_limit: routePolicies.every((policy) => policy.payloadLimitRequired),
    all_routes_have_result_limit: routePolicies.every((policy) => policy.resultLimitRequired),
    all_routes_have_timeout: routePolicies.every((policy) => policy.timeoutRequired),
    all_routes_are_route_scoped: routePolicies.every((policy) => policy.routeScoped),
    all_routes_have_evidence_policy: routePolicies.every(
      (policy) => policy.evidenceOrBlockedReasonRequired,
    ),
    all_tools_have_budget: allAiToolsHaveBudgetPolicy(),
    all_tools_have_rate_policy: AI_TOOL_NAMES.every((toolName) =>
      Boolean(getAiToolRateLimitPolicy(toolName)),
    ),
    tool_budget_count: toolBudgets.length,
  };
}
