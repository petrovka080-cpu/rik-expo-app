import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  type AgentBffRouteOperation,
} from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";
import { AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS } from "../../src/features/ai/agent/agentRuntimeTransportRegistry";

describe("AI domain runtime transport fallback boundary", () => {
  it("does not route domain BFF operations through the generic command center runtime", () => {
    const domainOperations = AGENT_BFF_ROUTE_DEFINITIONS
      .filter((route) =>
        AI_EXPLICIT_DOMAIN_RUNTIME_TRANSPORT_GROUPS.some((group) =>
          route.operation.startsWith(group.operationPrefix),
        ),
      )
      .map((route) => route.operation);

    expect(domainOperations.length).toBeGreaterThanOrEqual(21);

    for (const operation of domainOperations) {
      const mount = getAgentRuntimeGatewayMount(operation as AgentBffRouteOperation);
      expect(mount).not.toBeNull();
      expect(mount?.runtimeName).not.toBe("command_center");
      expect(mount).toMatchObject({
        authRequired: true,
        roleFiltered: true,
        directExecutionWithoutApproval: false,
        mutates: false,
        executesTool: false,
        callsDatabaseDirectly: false,
        callsModelProvider: false,
        rawRowsExposed: false,
        rawProviderPayloadExposed: false,
      });
    }
  });
});
