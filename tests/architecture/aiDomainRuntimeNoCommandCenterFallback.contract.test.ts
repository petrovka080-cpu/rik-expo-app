import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  type AgentBffRouteOperation,
} from "../../src/features/ai/agent/agentBffRouteShell";
import { getAgentRuntimeGatewayMount } from "../../src/features/ai/agent/agentRuntimeGateway";

const DOMAIN_RUNTIME_PREFIXES = [
  "agent.documents.",
  "agent.construction_knowhow.",
  "agent.finance.",
  "agent.warehouse.",
  "agent.field.",
] as const;

describe("AI domain runtime transport fallback boundary", () => {
  it("does not route domain BFF operations through the generic command center runtime", () => {
    const domainOperations = AGENT_BFF_ROUTE_DEFINITIONS
      .filter((route) => DOMAIN_RUNTIME_PREFIXES.some((prefix) => route.operation.startsWith(prefix)))
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
