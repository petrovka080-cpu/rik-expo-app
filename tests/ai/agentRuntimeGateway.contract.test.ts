import {
  AGENT_BFF_ROUTE_DEFINITIONS,
} from "../../src/features/ai/agent/agentBffRouteShell";
import {
  AGENT_RUNTIME_GATEWAY_CONTRACT,
  buildAgentRuntimeGatewayMatrix,
  getAgentRuntimeGatewayMount,
  getAgentRuntimeToolTransportMount,
  listAgentRuntimeGatewayMounts,
  validateAgentRuntimeGatewayRequest,
} from "../../src/features/ai/agent/agentRuntimeGateway";
import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";

const directorAuth = { userId: "director-runtime", role: "director" } as const;

describe("Agent runtime gateway", () => {
  it("mounts every Agent BFF route through one safe runtime boundary", () => {
    const mounts = listAgentRuntimeGatewayMounts();
    const matrix = buildAgentRuntimeGatewayMatrix();

    expect(AGENT_RUNTIME_GATEWAY_CONTRACT).toMatchObject({
      contractId: "agent_runtime_gateway_v1",
      backendFirst: true,
      routeScoped: true,
      roleScoped: true,
      budgetPolicyRequired: true,
      redactionRequired: true,
      evidencePolicyRequired: true,
      directSupabaseFromUi: false,
      directMutationFromUi: false,
      modelProviderCallsAllowed: false,
      mutationCount: 0,
      dbWrites: 0,
    });
    expect(mounts).toHaveLength(AGENT_BFF_ROUTE_DEFINITIONS.length);
    expect(matrix).toMatchObject({
      final_status: "GREEN_AGENT_BFF_RUNTIME_MOUNT_READY",
      all_routes_mounted: true,
      all_routes_auth_required: true,
      all_routes_role_scoped: true,
      all_routes_have_runtime_transport: true,
      all_routes_have_budget: true,
      all_routes_have_payload_limit: true,
      all_routes_have_result_limit: true,
      all_routes_have_timeout: true,
      all_routes_have_evidence_policy: true,
      all_tools_have_transport_boundary: true,
      all_tools_have_budget: true,
      all_tools_have_rate_policy: true,
      direct_supabase_from_ui: false,
      direct_mutation_from_ui: false,
      mutation_count: 0,
      final_execution: 0,
      provider_called: false,
      fake_green_claimed: false,
    });
    expect(mounts.every((mount) => mount.mutates === false)).toBe(true);
    expect(mounts.every((mount) => mount.callsDatabaseDirectly === false)).toBe(true);
    expect(mounts.every((mount) => mount.callsModelProvider === false)).toBe(true);
  });

  it("keeps all registered AI tools behind transport mounts", () => {
    for (const toolName of AI_TOOL_NAMES) {
      expect(getAgentRuntimeToolTransportMount(toolName)).toMatchObject({
        toolName,
        boundedRequest: true,
        dtoOnly: true,
        redactionRequired: true,
        mutationAllowedFromTool: false,
        supabaseImportAllowedInTool: false,
      });
    }
  });

  it("blocks unmounted, unauthenticated, unsafe, over-budget, and non-idempotent requests", () => {
    expect(validateAgentRuntimeGatewayRequest({ operation: "agent.unknown", auth: directorAuth })).toMatchObject({
      ok: false,
      error: { code: "AGENT_RUNTIME_ROUTE_NOT_MOUNTED", rawPayloadExposed: false },
    });
    expect(validateAgentRuntimeGatewayRequest({ operation: "agent.task_stream.read", auth: null })).toMatchObject({
      ok: false,
      error: { code: "AGENT_RUNTIME_AUTH_REQUIRED", secretExposed: false },
    });
    expect(
      validateAgentRuntimeGatewayRequest({
        operation: "agent.task_stream.read",
        auth: directorAuth,
        payload: { rawDbRows: [{ id: "row-1" }] },
        evidenceRefs: ["task:evidence:redacted"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_RUNTIME_FORBIDDEN_PAYLOAD" },
    });
    expect(
      validateAgentRuntimeGatewayRequest({
        operation: "agent.task_stream.read",
        auth: directorAuth,
        payload: { query: "x".repeat(5_000) },
        evidenceRefs: ["task:evidence:redacted"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_RUNTIME_PAYLOAD_TOO_LARGE" },
    });
    expect(
      validateAgentRuntimeGatewayRequest({
        operation: "agent.action.submit_for_approval",
        auth: directorAuth,
        payload: { draft: "request" },
        evidenceRefs: ["approval:evidence:redacted"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_RUNTIME_IDEMPOTENCY_REQUIRED" },
    });
  });

  it("allows an evidence-backed request without executing anything", () => {
    const decision = validateAgentRuntimeGatewayRequest({
      operation: "agent.procurement.copilot.plan.preview",
      auth: directorAuth,
      payload: { screenId: "procurement.copilot" },
      evidenceRefs: ["procurement:evidence:redacted"],
      requestedLimit: 1,
    });

    expect(decision).toMatchObject({
      ok: true,
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      finalExecution: 0,
    });
    if (!decision.ok) return;
    expect(decision.mount).toMatchObject({
      operation: "agent.procurement.copilot.plan.preview",
      runtimeName: "procurement_copilot",
      redactionRequired: true,
      evidencePolicyRequired: true,
      directExecutionWithoutApproval: false,
    });
    expect(getAgentRuntimeGatewayMount("agent.action.execute_approved")).toMatchObject({
      runtimeName: "approved_executor",
      approvedGatewayRequired: true,
      directExecutionWithoutApproval: false,
    });
  });
});
