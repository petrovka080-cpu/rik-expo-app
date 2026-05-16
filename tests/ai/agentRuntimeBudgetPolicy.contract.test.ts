import {
  AGENT_BFF_ROUTE_DEFINITIONS,
} from "../../src/features/ai/agent/agentBffRouteShell";
import {
  allAgentRuntimeRoutesHaveBudgetPolicy,
  allAgentRuntimeToolsHaveBudgetAndRatePolicy,
  buildAgentRuntimeBudgetPolicyMatrix,
  getAgentRuntimeRouteBudgetPolicy,
  listAgentRuntimeRouteBudgetPolicies,
} from "../../src/features/ai/agent/agentRuntimeBudgetPolicy";

describe("Agent runtime budget policy", () => {
  it("covers every Agent BFF route with payload, result, timeout, and evidence policy", () => {
    const policies = listAgentRuntimeRouteBudgetPolicies();
    const matrix = buildAgentRuntimeBudgetPolicyMatrix();

    expect(policies).toHaveLength(AGENT_BFF_ROUTE_DEFINITIONS.length);
    expect(allAgentRuntimeRoutesHaveBudgetPolicy()).toBe(true);
    expect(matrix).toMatchObject({
      all_routes_have_budget: true,
      all_routes_have_explicit_policy: true,
      no_extra_explicit_route_policies: true,
      all_routes_have_payload_limit: true,
      all_routes_have_result_limit: true,
      all_routes_have_timeout: true,
      all_routes_are_route_scoped: true,
      all_routes_use_explicit_policy_source: true,
      all_routes_have_evidence_policy: true,
      all_tools_have_budget: true,
      all_tools_have_rate_policy: true,
    });
    expect(policies.every((policy) => policy.maxPayloadBytes > 0)).toBe(true);
    expect(policies.every((policy) => policy.maxResultLimit > 0)).toBe(true);
    expect(policies.every((policy) => policy.timeoutMs > 0)).toBe(true);
  });

  it("requires idempotency for submit and approved execution routes", () => {
    expect(getAgentRuntimeRouteBudgetPolicy("agent.action.submit_for_approval")).toMatchObject({
      idempotencyRequired: true,
      auditRequired: true,
      routeClass: "approval_ledger",
      approvedGatewayRequired: false,
    });
    expect(getAgentRuntimeRouteBudgetPolicy("agent.action.execute_approved")).toMatchObject({
      idempotencyRequired: true,
      auditRequired: true,
      routeClass: "approved_executor",
      approvedGatewayRequired: true,
      directExecutionWithoutApproval: false,
    });
    expect(getAgentRuntimeRouteBudgetPolicy("agent.task_stream.read")).toMatchObject({
      idempotencyRequired: false,
      routeClass: "read",
      approvedGatewayRequired: false,
    });
    expect(getAgentRuntimeRouteBudgetPolicy("agent.procurement.submit_for_approval")).toMatchObject({
      idempotencyRequired: true,
      auditRequired: true,
      routeClass: "approval_ledger",
      approvedGatewayRequired: false,
    });
  });

  it("keeps all registered tools behind budget and rate policy", () => {
    expect(allAgentRuntimeToolsHaveBudgetAndRatePolicy()).toBe(true);
  });
});
