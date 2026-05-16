import {
  getAgentRuntimeGatewayMount,
  listAgentRuntimeGatewayMounts,
} from "../../src/features/ai/agent/agentRuntimeGateway";
import { listAgentRuntimeRoutePolicyRegistryEntries } from "../../src/features/ai/agent/agentRuntimeRoutePolicyRegistry";
import { buildAiRuntimeGatewayExecutionPolicyMatrix } from "../../scripts/ai/verifyAiRuntimeGatewayExecutionPolicy";

describe("Agent runtime gateway execution policy", () => {
  it("sources approved execution gates from the explicit route policy registry", () => {
    const matrix = buildAiRuntimeGatewayExecutionPolicyMatrix();

    expect(matrix).toMatchObject({
      final_status: "GREEN_AI_RUNTIME_GATEWAY_EXECUTION_POLICY_READY",
      all_routes_have_gateway_execution_policy: true,
      approved_gateway_matches_policy: true,
      approved_executor_routes_require_gateway: true,
      non_approved_routes_do_not_require_gateway: true,
      approved_gateway_routes_require_idempotency_and_audit: true,
      direct_execution_without_approval_zero: true,
      gateway_matrix_uses_explicit_execution_policy: true,
      no_gateway_operation_name_heuristics: true,
      no_db_writes: true,
      no_direct_database_access: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_raw_provider_payloads: true,
      no_ui_changes: true,
      no_fake_green: true,
    });
    expect(matrix.missing_policy_operations).toEqual([]);
    expect(matrix.missing_mount_operations).toEqual([]);
    expect(matrix.drift_operations).toEqual([]);
  });

  it("marks only approved_executor policy routes as approved gateway routes", () => {
    const approvedPolicyOperations = listAgentRuntimeRoutePolicyRegistryEntries()
      .filter((policy) => policy.routeClass === "approved_executor")
      .map((policy) => policy.operation)
      .sort();
    const approvedGatewayOperations = listAgentRuntimeGatewayMounts()
      .filter((mount) => mount.approvedGatewayRequired)
      .map((mount) => mount.operation)
      .sort();

    expect(approvedPolicyOperations).toEqual([
      "agent.action.execute_approved",
      "agent.approval_inbox.execute_approved",
    ]);
    expect(approvedGatewayOperations).toEqual(approvedPolicyOperations);

    for (const operation of approvedGatewayOperations) {
      expect(getAgentRuntimeGatewayMount(operation)).toMatchObject({
        executionPolicySource: "explicit_route_policy_registry",
        approvedGatewayRequired: true,
        directExecutionWithoutApproval: false,
      });
    }
  });
});
