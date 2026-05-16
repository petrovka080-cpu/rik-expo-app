import { readFileSync } from "fs";
import { join } from "path";
import {
  AGENT_RUNTIME_GATEWAY_CONTRACT,
  buildAgentRuntimeGatewayMatrix,
  listAgentRuntimeGatewayMounts,
} from "../../src/features/ai/agent/agentRuntimeGateway";

const files = [
  "src/features/ai/agent/agentRuntimeGateway.ts",
  "src/features/ai/agent/agentRuntimeTransportRegistry.ts",
  "src/features/ai/agent/agentRuntimeRoutePolicyRegistry.ts",
  "src/features/ai/agent/agentRuntimeBudgetPolicy.ts",
  "src/features/ai/agent/agentRuntimeRedaction.ts",
  "src/features/ai/agent/agentRuntimeErrors.ts",
];

describe("Agent BFF runtime mount architecture", () => {
  it("mounts the runtime gateway as a no-mutation, no-provider boundary", () => {
    const matrix = buildAgentRuntimeGatewayMatrix();

    expect(AGENT_RUNTIME_GATEWAY_CONTRACT).toMatchObject({
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
      directSupabaseFromUi: false,
      directMutationFromUi: false,
      modelProviderCallsAllowed: false,
      mutationCount: 0,
      dbWrites: 0,
    });
    expect(matrix).toMatchObject({
      final_status: "GREEN_AGENT_BFF_RUNTIME_MOUNT_READY",
      all_routes_mounted: true,
      all_routes_have_runtime_transport: true,
      all_routes_have_budget: true,
      all_gateway_execution_policy_explicit: true,
      approved_gateway_route_count: 2,
      approved_gateway_routes_match_policy: true,
      all_tools_have_transport_boundary: true,
      direct_supabase_from_ui: false,
      direct_mutation_from_ui: false,
      auth_admin_used: false,
      list_users_used: false,
      privileged_backend_role_used: false,
      external_live_fetch: false,
      model_provider_changed: false,
      gpt_enabled: false,
      gemini_removed: false,
      fake_green_claimed: false,
    });
    expect(listAgentRuntimeGatewayMounts().every((mount) => mount.directExecutionWithoutApproval === false)).toBe(true);
  });

  it("keeps runtime gateway files free of direct DB, provider, and network access", () => {
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
      expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
      expect(source).not.toMatch(/\b(openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider)\b/i);
    }
  });
});
