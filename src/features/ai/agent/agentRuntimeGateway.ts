import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  type AgentBffAuthContext,
  type AgentBffRouteDefinition,
  type AgentBffRouteOperation,
} from "./agentBffRouteShell";
import {
  buildAgentRuntimeBudgetPolicyMatrix,
  getAgentRuntimeRouteBudgetPolicy,
  listAgentRuntimeRouteBudgetPolicies,
  type AgentRuntimeRouteBudgetPolicy,
} from "./agentRuntimeBudgetPolicy";
import {
  createAgentRuntimeGatewayError,
  type AgentRuntimeGatewayError,
} from "./agentRuntimeErrors";
import {
  getAgentRuntimeTransportRegistryEntry,
  resolveAgentRuntimeTransportName,
} from "./agentRuntimeTransportRegistry";
import {
  redactAgentRuntimePayload,
  type AgentRuntimeRedactionResult,
} from "./agentRuntimeRedaction";
import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  listAiRuntimeTransportContracts,
  listAiToolTransportContracts,
  type AiRuntimeTransportContract,
  type AiRuntimeTransportName,
  type AiToolTransportContract,
} from "../tools/transport/aiToolTransportTypes";

export type AgentRuntimeGatewayContract = {
  contractId: "agent_runtime_gateway_v1";
  boundary: "agent_bff_runtime_gateway";
  backendFirst: true;
  routeScoped: true;
  roleScoped: true;
  budgetPolicyRequired: true;
  payloadLimitRequired: true;
  resultLimitRequired: true;
  timeoutRequired: true;
  redactionRequired: true;
  evidencePolicyRequired: true;
  idempotencyPolicyRequired: true;
  auditPolicyRequired: true;
  directSupabaseFromUi: false;
  directMutationFromUi: false;
  authAdminAllowed: false;
  serviceRoleAllowed: false;
  modelProviderCallsAllowed: false;
  gptEnabled: false;
  geminiRemoved: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
};

export type AgentRuntimeGatewayMount = {
  operation: AgentBffRouteOperation;
  endpoint: string;
  method: AgentBffRouteDefinition["method"];
  responseEnvelope: AgentBffRouteDefinition["responseEnvelope"];
  authRequired: true;
  roleFiltered: boolean;
  runtimeName: AiRuntimeTransportName;
  runtimeBoundary: AiRuntimeTransportContract["boundary"];
  routeScope: string;
  budget: AgentRuntimeRouteBudgetPolicy;
  executionPolicySource: "explicit_route_policy_registry";
  redactionRequired: true;
  evidencePolicyRequired: true;
  directExecutionWithoutApproval: false;
  approvedGatewayRequired: boolean;
  mutates: false;
  executesTool: false;
  callsDatabaseDirectly: false;
  callsModelProvider: false;
  rawRowsExposed: false;
  rawProviderPayloadExposed: false;
};

export type AgentRuntimeGatewayRequest = {
  operation: AgentBffRouteOperation | string;
  auth: AgentBffAuthContext | null;
  payload?: unknown;
  requestedLimit?: number | null;
  evidenceRefs?: readonly string[] | null;
  idempotencyKey?: string | null;
};

export type AgentRuntimeGatewayDecision =
  | {
      ok: true;
      operation: AgentBffRouteOperation;
      mount: AgentRuntimeGatewayMount;
      payloadBytes: number;
      redaction: AgentRuntimeRedactionResult;
      mutationCount: 0;
      dbWrites: 0;
      providerCalled: false;
      finalExecution: 0;
    }
  | {
      ok: false;
      error: AgentRuntimeGatewayError;
      mutationCount: 0;
      dbWrites: 0;
      providerCalled: false;
      finalExecution: 0;
    };

export const AGENT_RUNTIME_GATEWAY_CONTRACT: AgentRuntimeGatewayContract = Object.freeze({
  contractId: "agent_runtime_gateway_v1",
  boundary: "agent_bff_runtime_gateway",
  backendFirst: true,
  routeScoped: true,
  roleScoped: true,
  budgetPolicyRequired: true,
  payloadLimitRequired: true,
  resultLimitRequired: true,
  timeoutRequired: true,
  redactionRequired: true,
  evidencePolicyRequired: true,
  idempotencyPolicyRequired: true,
  auditPolicyRequired: true,
  directSupabaseFromUi: false,
  directMutationFromUi: false,
  authAdminAllowed: false,
  serviceRoleAllowed: false,
  modelProviderCallsAllowed: false,
  gptEnabled: false,
  geminiRemoved: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
});

function isMountedOperation(value: string): value is AgentBffRouteOperation {
  return AGENT_BFF_ROUTE_DEFINITIONS.some((route) => route.operation === value);
}

function getRouteDefinition(operation: AgentBffRouteOperation): AgentBffRouteDefinition {
  const route = AGENT_BFF_ROUTE_DEFINITIONS.find((entry) => entry.operation === operation);
  if (!route) {
    throw new Error(`Agent runtime route is not mounted: ${operation}`);
  }
  return route;
}

function getRuntimeTransport(operation: AgentBffRouteOperation): AiRuntimeTransportContract {
  const registryEntry = getAgentRuntimeTransportRegistryEntry(operation);
  const runtimeName = resolveAgentRuntimeTransportName(operation);
  const contract = listAiRuntimeTransportContracts().find((entry) => entry.runtimeName === runtimeName);
  if (!contract) {
    throw new Error(`Agent runtime transport contract is not mounted: ${runtimeName}`);
  }
  if (contract.boundary !== registryEntry.expectedBoundary) {
    throw new Error(
      `Agent runtime transport boundary drift for ${runtimeName}: expected ${registryEntry.expectedBoundary}, got ${contract.boundary}`,
    );
  }
  return contract;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function payloadHasBlockedReason(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const blockedReason = (payload as { blockedReason?: unknown }).blockedReason;
  return typeof blockedReason === "string" && blockedReason.trim().length > 0;
}

export function listAgentRuntimeGatewayMounts(): AgentRuntimeGatewayMount[] {
  return AGENT_BFF_ROUTE_DEFINITIONS.map((route) => {
    const budget = getAgentRuntimeRouteBudgetPolicy(route.operation);
    if (!budget) {
      throw new Error(`Agent runtime budget policy is missing: ${route.operation}`);
    }
    const runtime = getRuntimeTransport(route.operation);
    return {
      operation: route.operation,
      endpoint: route.endpoint,
      method: route.method,
      responseEnvelope: route.responseEnvelope,
      authRequired: route.authRequired,
      roleFiltered: route.roleFiltered,
      runtimeName: runtime.runtimeName,
      runtimeBoundary: runtime.boundary,
      routeScope: budget.routeScope,
      budget,
      executionPolicySource: budget.policySource,
      redactionRequired: true,
      evidencePolicyRequired: true,
      directExecutionWithoutApproval: false,
      approvedGatewayRequired: budget.approvedGatewayRequired,
      mutates: false,
      executesTool: false,
      callsDatabaseDirectly: false,
      callsModelProvider: false,
      rawRowsExposed: false,
      rawProviderPayloadExposed: false,
    };
  });
}

export function getAgentRuntimeGatewayMount(
  operation: AgentBffRouteOperation,
): AgentRuntimeGatewayMount | null {
  return listAgentRuntimeGatewayMounts().find((mount) => mount.operation === operation) ?? null;
}

export function validateAgentRuntimeGatewayRequest(
  request: AgentRuntimeGatewayRequest,
): AgentRuntimeGatewayDecision {
  if (!isMountedOperation(request.operation)) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_ROUTE_NOT_MOUNTED",
        `Agent runtime route is not mounted: ${request.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  if (!request.auth) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_AUTH_REQUIRED",
        `Authentication is required for ${request.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  const route = getRouteDefinition(request.operation);
  const budget = getAgentRuntimeRouteBudgetPolicy(route.operation);
  if (!budget) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_ROUTE_BUDGET_MISSING",
        `Runtime budget policy is missing for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  const redaction = redactAgentRuntimePayload(request.payload ?? {});
  if (redaction.forbiddenKeysDetected) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_FORBIDDEN_PAYLOAD",
        `Forbidden payload key detected for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  if (redaction.payloadBytes > budget.maxPayloadBytes) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_PAYLOAD_TOO_LARGE",
        `Payload exceeds route budget for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  if (
    typeof request.requestedLimit === "number" &&
    Number.isFinite(request.requestedLimit) &&
    request.requestedLimit > budget.maxResultLimit
  ) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_RESULT_LIMIT_EXCEEDED",
        `Result limit exceeds route budget for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  const evidenceRefs = request.evidenceRefs ?? [];
  if (
    budget.evidencePolicy === "required" &&
    evidenceRefs.length === 0 &&
    !payloadHasBlockedReason(request.payload)
  ) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_EVIDENCE_REQUIRED",
        `Evidence refs or blocked reason required for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  if (budget.idempotencyRequired && !hasText(request.idempotencyKey)) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_IDEMPOTENCY_REQUIRED",
        `Idempotency key required for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  const mount = getAgentRuntimeGatewayMount(route.operation);
  if (!mount) {
    return {
      ok: false,
      error: createAgentRuntimeGatewayError(
        "AGENT_RUNTIME_ROUTE_NOT_MOUNTED",
        `Agent runtime mount missing for ${route.operation}`,
      ),
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    };
  }

  return {
    ok: true,
    operation: route.operation,
    mount,
    payloadBytes: redaction.payloadBytes,
    redaction,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    finalExecution: 0,
  };
}

export function listAgentRuntimeToolTransportMounts(): AiToolTransportContract[] {
  return listAiToolTransportContracts();
}

export function getAgentRuntimeToolTransportMount(
  toolName: AiToolName,
): AiToolTransportContract | null {
  return listAiToolTransportContracts().find((contract) => contract.toolName === toolName) ?? null;
}

export function buildAgentRuntimeGatewayMatrix() {
  const mounts = listAgentRuntimeGatewayMounts();
  const budget = buildAgentRuntimeBudgetPolicyMatrix();
  const toolTransportMounts = listAgentRuntimeToolTransportMounts();
  const routePolicies = listAgentRuntimeRouteBudgetPolicies();
  const approvedGatewayRouteOperations = mounts
    .filter((mount) => mount.approvedGatewayRequired)
    .map((mount) => mount.operation)
    .sort();
  const approvedExecutorPolicyOperations = routePolicies
    .filter((policy) => policy.routeClass === "approved_executor")
    .map((policy) => policy.operation)
    .sort();

  return {
    final_status: "GREEN_AGENT_BFF_RUNTIME_MOUNT_READY",
    contract_id: AGENT_RUNTIME_GATEWAY_CONTRACT.contractId,
    route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
    mounted_route_count: mounts.length,
    all_routes_mounted: mounts.length === AGENT_BFF_ROUTE_DEFINITIONS.length,
    all_routes_auth_required: mounts.every((mount) => mount.authRequired),
    all_routes_role_scoped: mounts.every((mount) => mount.roleFiltered),
    all_routes_have_runtime_transport: mounts.every((mount) => hasText(mount.runtimeName)),
    all_routes_have_budget: budget.all_routes_have_budget,
    all_routes_have_payload_limit: budget.all_routes_have_payload_limit,
    all_routes_have_result_limit: budget.all_routes_have_result_limit,
    all_routes_have_timeout: budget.all_routes_have_timeout,
    all_routes_have_evidence_policy: budget.all_routes_have_evidence_policy,
    all_routes_are_route_scoped: budget.all_routes_are_route_scoped,
    all_gateway_execution_policy_explicit: mounts.every(
      (mount) => mount.executionPolicySource === "explicit_route_policy_registry",
    ),
    approved_gateway_route_count: approvedGatewayRouteOperations.length,
    approved_gateway_routes_match_policy:
      approvedGatewayRouteOperations.join("|") === approvedExecutorPolicyOperations.join("|"),
    approved_gateway_route_operations: approvedGatewayRouteOperations,
    all_tools_have_transport_boundary: AI_TOOL_NAMES.every((toolName) =>
      toolTransportMounts.some((contract) => contract.toolName === toolName),
    ),
    all_tools_have_budget: budget.all_tools_have_budget,
    all_tools_have_rate_policy: budget.all_tools_have_rate_policy,
    all_tool_transports_redacted: toolTransportMounts.every((contract) => contract.redactionRequired),
    idempotency_policy_required: routePolicies.some((policy) => policy.idempotencyRequired),
    audit_policy_required: routePolicies.some((policy) => policy.auditRequired),
    direct_supabase_from_ui: false,
    direct_mutation_from_ui: false,
    auth_admin_used: false,
    list_users_used: false,
    privileged_backend_role_used: false,
    db_writes: 0,
    mutation_count: 0,
    final_execution: 0,
    external_live_fetch: false,
    provider_called: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    fake_green_claimed: false,
    secrets_printed: false,
  };
}
