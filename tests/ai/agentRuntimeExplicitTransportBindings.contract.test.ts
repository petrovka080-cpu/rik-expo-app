import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { buildAiRuntimeExplicitTransportBindingsMatrix } from "../../scripts/ai/verifyAiRuntimeExplicitTransportBindings";

describe("Agent runtime explicit transport bindings", () => {
  it("binds every mounted route exactly once without pattern matchers", () => {
    const matrix = buildAiRuntimeExplicitTransportBindingsMatrix();

    expect(matrix).toMatchObject({
      final_status: "GREEN_AI_RUNTIME_EXPLICIT_TRANSPORT_BINDINGS_READY",
      route_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
      explicit_binding_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
      unique_binding_count: AGENT_BFF_ROUTE_DEFINITIONS.length,
      all_routes_bound_once: true,
      no_extra_bindings: true,
      no_duplicate_bindings: true,
      no_pattern_matchers: true,
      all_bindings_match_gateway: true,
      all_boundaries_aligned: true,
      all_runtime_contracts_mounted: true,
      no_fallback_entries: true,
      no_command_center_routes: true,
      unknown_operation_fails_closed: true,
      no_db_writes: true,
      no_direct_database_access: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_raw_provider_payloads: true,
      no_ui_changes: true,
      no_fake_green: true,
    });
    expect(matrix.missing_operations).toEqual([]);
    expect(matrix.extra_operations).toEqual([]);
    expect(matrix.duplicate_operations).toEqual([]);
    expect(matrix.route_drifts).toEqual([]);
  });

  it("keeps registry entries as explicit operation lists", () => {
    for (const entry of listAgentRuntimeTransportRegistryEntries()) {
      expect(entry.operations.length).toBeGreaterThan(0);
      expect(entry.fallback).toBe(false);
      expect(new Set(entry.operations).size).toBe(entry.operations.length);
    }

    for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
      const entry = getAgentRuntimeTransportRegistryEntry(route.operation);
      expect(entry.operations).toContain(route.operation);
      expect(resolveAgentRuntimeTransportName(route.operation)).toBe(entry.runtimeName);
    }
  });
});
