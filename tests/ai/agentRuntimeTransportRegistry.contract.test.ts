import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import {
  AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS,
  getAgentRuntimeTransportRegistryEntry,
  listAgentRuntimeTransportRegistryEntries,
  resolveAgentRuntimeTransportName,
} from "../../src/features/ai/agent/agentRuntimeTransportRegistry";
import { listAiRuntimeTransportContracts } from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import { buildAiRuntimeTransportRegistryHardeningMatrix } from "../../scripts/ai/verifyAiRuntimeTransportRegistryHardening";

describe("Agent runtime transport registry", () => {
  it("keeps gateway runtime selection sourced from the transport registry", () => {
    const matrix = buildAiRuntimeTransportRegistryHardeningMatrix();

    expect(matrix.final_status).toBe("GREEN_AI_RUNTIME_TRANSPORT_REGISTRY_HARDENING_READY");
    expect(matrix.all_registry_runtime_contracts_mounted).toBe(true);
    expect(matrix.all_registry_boundaries_aligned).toBe(true);
    expect(matrix.all_gateway_mounts_match_registry).toBe(true);
    expect(matrix.fallback_entry_count).toBe(0);
    expect(matrix.no_domain_command_center_fallback).toBe(true);
    expect(matrix.all_domain_groups_explicit).toBe(true);
    expect(matrix.no_db_writes).toBe(true);
    expect(matrix.no_provider_calls).toBe(true);
    expect(matrix.no_raw_rows).toBe(true);
    expect(matrix.no_raw_provider_payloads).toBe(true);
  });

  it("maps every mounted BFF route to the same runtime in registry and gateway", () => {
    for (const route of AGENT_BFF_ROUTE_DEFINITIONS) {
      const registryEntry = getAgentRuntimeTransportRegistryEntry(route.operation);
      const mount = getAgentRuntimeGatewayMount(route.operation);

      expect(mount).not.toBeNull();
      expect(registryEntry.operations).toContain(route.operation);
      expect(resolveAgentRuntimeTransportName(route.operation)).toBe(registryEntry.runtimeName);
      expect(mount?.runtimeName).toBe(registryEntry.runtimeName);
      expect(mount?.runtimeBoundary).toBe(registryEntry.expectedBoundary);
      expect(mount?.mutates).toBe(false);
      expect(mount?.callsDatabaseDirectly).toBe(false);
      expect(mount?.callsModelProvider).toBe(false);
      expect(mount?.rawRowsExposed).toBe(false);
      expect(mount?.rawProviderPayloadExposed).toBe(false);
    }
  });

  it("keeps explicit domain runtime groups out of the generic command center fallback", () => {
    for (const group of AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS) {
      const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
        route.operation.startsWith(group.operationPrefix),
      );

      expect(routes.length).toBeGreaterThanOrEqual(group.minRouteCount);
      for (const route of routes) {
        expect(resolveAgentRuntimeTransportName(route.operation)).toBe(group.expectedRuntimeName);
        expect(getAgentRuntimeGatewayMount(route.operation)).toMatchObject({
          runtimeName: group.expectedRuntimeName,
          runtimeBoundary: group.expectedBoundary,
          approvedGatewayRequired: false,
          mutates: false,
          callsDatabaseDirectly: false,
          callsModelProvider: false,
        });
      }
    }
  });

  it("routes agent tool registry operations through an explicit tool_registry runtime", () => {
    const toolRoutes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.tools."),
    );

    expect(toolRoutes.map((route) => route.operation).sort()).toEqual([
      "agent.tools.list",
      "agent.tools.preview",
      "agent.tools.validate",
    ]);
    for (const route of toolRoutes) {
      expect(resolveAgentRuntimeTransportName(route.operation)).toBe("tool_registry");
      expect(getAgentRuntimeTransportRegistryEntry(route.operation)).toMatchObject({
        entryId: "tool_registry",
        fallback: false,
        runtimeName: "tool_registry",
        expectedBoundary: "runtime_read_transport",
      });
      expect(getAgentRuntimeGatewayMount(route.operation)).toMatchObject({
        runtimeName: "tool_registry",
        runtimeBoundary: "runtime_read_transport",
        approvedGatewayRequired: false,
        mutates: false,
        callsDatabaseDirectly: false,
        callsModelProvider: false,
      });
    }
  });

  it("fails closed for unknown operations instead of falling back", () => {
    expect(() => resolveAgentRuntimeTransportName("agent.unknown.operation")).toThrow(
      "Agent runtime transport is not registered",
    );
  });

  it("aligns every registry runtime with a mounted transport contract", () => {
    const contracts = listAiRuntimeTransportContracts();

    for (const entry of listAgentRuntimeTransportRegistryEntries()) {
      expect(entry.operations.length).toBeGreaterThan(0);
      expect(new Set(entry.operations).size).toBe(entry.operations.length);
      expect(contracts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            runtimeName: entry.runtimeName,
            boundary: entry.expectedBoundary,
            boundedRequest: true,
            dtoOnly: true,
            redactionRequired: true,
            evidenceRefsOrBlockedReasonRequired: true,
            mutationAllowedFromUi: false,
            rawRowsExposed: false,
            rawProviderPayloadExposed: false,
          }),
        ]),
      );
    }
  });
});
