import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { buildAiRuntimeNoFallbackTransportRegistryMatrix } from "../../scripts/ai/verifyAiRuntimeNoFallbackTransportRegistry";

describe("Agent runtime no-fallback transport registry", () => {
  it("keeps every mounted route on an explicit non-fallback transport", () => {
    const matrix = buildAiRuntimeNoFallbackTransportRegistryMatrix();

    expect(matrix).toMatchObject({
      final_status: "GREEN_AI_RUNTIME_TRANSPORT_NO_FALLBACK_READY",
      route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
      all_routes_registered: true,
      all_routes_match_gateway: true,
      all_boundaries_aligned: true,
      no_fallback_entries: true,
      no_route_uses_fallback: true,
      no_command_center_route_fallback: true,
      tool_routes_explicit: true,
      unknown_operation_fails_closed: true,
      no_db_writes: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_raw_provider_payloads: true,
      no_fake_green: true,
    });
    expect(matrix.fallback_entry_count).toBe(0);
    expect(matrix.command_center_route_count).toBe(0);
    expect(matrix.missing_operations).toEqual([]);
    expect(matrix.fallback_operations).toEqual([]);
    expect(matrix.route_drifts).toEqual([]);
    expect(listAgentRuntimeTransportRegistryEntries().every((entry) => entry.fallback === false)).toBe(true);
  });

  it("does not send agent.tools routes through command_center", () => {
    for (const operation of [
      "agent.tools.list",
      "agent.tools.validate",
      "agent.tools.preview",
    ] as const) {
      expect(getAgentRuntimeTransportRegistryEntry(operation)).toMatchObject({
        entryId: "tool_registry",
        runtimeName: "tool_registry",
        expectedBoundary: "runtime_read_transport",
        fallback: false,
      });
      expect(resolveAgentRuntimeTransportName(operation)).toBe("tool_registry");
      expect(getAgentRuntimeGatewayMount(operation)).toMatchObject({
        runtimeName: "tool_registry",
        runtimeBoundary: "runtime_read_transport",
        mutates: false,
        callsDatabaseDirectly: false,
        callsModelProvider: false,
      });
    }
  });

  it("fails closed for unmounted operations before any fallback can be selected", () => {
    expect(() => getAgentRuntimeTransportRegistryEntry("agent.not_registered")).toThrow(
      "Agent runtime transport is not registered",
    );
    expect(() => resolveAgentRuntimeTransportName("agent.not_registered")).toThrow(
      "Agent runtime transport is not registered",
    );
  });
});
