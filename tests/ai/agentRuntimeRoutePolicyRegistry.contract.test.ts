import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  getAgentRuntimeRouteBudgetPolicy,
  listAgentRuntimeRouteBudgetPolicies,
} from "../../src/features/ai/agent/agentRuntimeBudgetPolicy";
import {
  getAgentRuntimeRoutePolicyRegistryEntry,
  listAgentRuntimeRoutePolicyRegistryEntries,
} from "../../src/features/ai/agent/agentRuntimeRoutePolicyRegistry";
import { buildAiRuntimeRoutePolicyRegistryMatrix } from "../../scripts/ai/verifyAiRuntimeRoutePolicyRegistry";

describe("Agent runtime route policy registry", () => {
  it("covers every mounted Agent BFF route with an explicit route policy", () => {
    const matrix = buildAiRuntimeRoutePolicyRegistryMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_RUNTIME_ROUTE_POLICY_REGISTRY_READY");
    expect(matrix.route_count).toBe(AGENT_BFF_ROUTE_DEFINITIONS.length);
    expect(matrix.explicit_route_policy_count).toBe(AGENT_BFF_ROUTE_DEFINITIONS.length);
    expect(matrix.all_routes_have_explicit_policy).toBe(true);
    expect(matrix.no_extra_explicit_route_policies).toBe(true);
    expect(matrix.no_duplicate_explicit_route_policies).toBe(true);
    expect(matrix.all_budget_policies_use_explicit_registry).toBe(true);
    expect(matrix.no_db_writes).toBe(true);
    expect(matrix.no_provider_calls).toBe(true);
    expect(matrix.no_raw_rows).toBe(true);
    expect(matrix.no_raw_provider_payloads).toBe(true);
  });

  it("uses explicit policy entries as the budget policy source", () => {
    for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
      const registryPolicy = getAgentRuntimeRoutePolicyRegistryEntry(route.operation);
      const budgetPolicy = getAgentRuntimeRouteBudgetPolicy(route.operation);

      expect(registryPolicy).not.toBeNull();
      expect(budgetPolicy).toMatchObject({
        operation: route.operation,
        routeClass: registryPolicy?.routeClass,
        idempotencyRequired: registryPolicy?.idempotencyRequired,
        auditRequired: registryPolicy?.auditRequired,
        evidencePolicy: registryPolicy?.evidencePolicy,
        explicitPolicyRequired: true,
        policySource: "explicit_route_policy_registry",
      });
    }
  });

  it("keeps real submit-for-approval routes in the approval ledger budget class", () => {
    const actualSubmitRoutes = listAgentRuntimeRouteBudgetPolicies().filter(
      (policy) =>
        policy.operation === "agent.action.submit_for_approval" ||
        policy.operation.endsWith(".submit_for_approval"),
    );

    expect(actualSubmitRoutes.map((policy) => policy.operation).sort()).toEqual([
      "agent.action.submit_for_approval",
      "agent.procurement.live_supplier_chain.submit_for_approval",
      "agent.procurement.submit_for_approval",
    ]);
    for (const policy of actualSubmitRoutes) {
      expect(policy).toMatchObject({
        routeClass: "approval_ledger",
        idempotencyRequired: true,
        auditRequired: true,
      });
    }
  });

  it("keeps tool registry routes optional-or-blocked-reason instead of requiring fake evidence", () => {
    const toolPolicies = listAgentRuntimeRoutePolicyRegistryEntries().filter((entry) =>
      entry.operation.startsWith("agent.tools."),
    );

    expect(toolPolicies).toHaveLength(3);
    for (const policy of toolPolicies) {
      expect(policy).toMatchObject({
        routeClass: "tool_registry",
        evidencePolicy: "optional_or_blocked_reason",
        idempotencyRequired: false,
        auditRequired: false,
        mutationCount: 0,
        dbWrites: 0,
        providerCalls: false,
      });
    }
  });
});
