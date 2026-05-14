import {
  AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT,
  analyzeAgentConstructionKnowhow,
  createAgentConstructionDecisionCard,
  getAgentConstructionKnowhowDomains,
  getAgentConstructionKnowhowRoleProfile,
  planAgentConstructionKnowhowAction,
  previewAgentConstructionExternalIntel,
} from "../../src/features/ai/agent/agentConstructionKnowhowRoutes";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

describe("Agent construction know-how BFF routes", () => {
  const auth = { userId: "director-control", role: "director" as const };

  it("mounts construction know-how routes as read-only BFF contracts", () => {
    expect(AGENT_CONSTRUCTION_KNOWHOW_BFF_CONTRACT.endpoints).toEqual([
      "GET /agent/construction-knowhow/domains",
      "GET /agent/construction-knowhow/role-profile/:roleId",
      "POST /agent/construction-knowhow/analyze",
      "POST /agent/construction-knowhow/decision-card",
      "POST /agent/construction-knowhow/action-plan",
      "POST /agent/construction-knowhow/external-preview",
    ]);

    const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.construction_knowhow."),
    );
    expect(routes).toHaveLength(6);
    expect(routes.every((route) => route.mutates === false)).toBe(true);
    expect(routes.every((route) => route.callsModelProvider === false)).toBe(true);
    expect(routes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
  });

  it("returns sanitized professional cards, action plans, and external preview policy", () => {
    const domains = getAgentConstructionKnowhowDomains({ auth });
    const role = getAgentConstructionKnowhowRoleProfile({ auth, roleId: "director_control" });
    const analysis = analyzeAgentConstructionKnowhow({
      auth,
      input: {
        roleId: "director_control",
        domainId: "procurement",
        observedSignals: ["requested material is not covered"],
      },
    });
    const card = createAgentConstructionDecisionCard({
      auth,
      input: {
        roleId: "director_control",
        domainId: "procurement",
        externalPreviewRequested: true,
      },
    });
    const actionPlan = planAgentConstructionKnowhowAction({
      auth,
      input: { roleId: "director_control", domainId: "procurement" },
    });
    const external = previewAgentConstructionExternalIntel({
      auth,
      input: { roleId: "director_control", domainId: "procurement", externalPreviewRequested: true },
    });

    for (const envelope of [domains, role, analysis, card, actionPlan, external]) {
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) continue;
      expect(envelope.data.mutation_count).toBe(0);
      expect(envelope.data.db_writes).toBe(0);
      expect(envelope.data.direct_supabase_from_ui).toBe(false);
      expect(envelope.data.mobile_external_fetch).toBe(false);
      expect(envelope.data.raw_rows_returned).toBe(false);
      expect(envelope.data.raw_prompt_returned).toBe(false);
      expect(envelope.data.provider_payload_returned).toBe(false);
      expect(envelope.data.secrets_printed).toBe(false);
      expect(envelope.data.providerCalled).toBe(false);
    }
  });

  it("blocks unauthenticated access", () => {
    expect(getAgentConstructionKnowhowDomains({ auth: null }).ok).toBe(false);
    expect(
      createAgentConstructionDecisionCard({
        auth: null,
        input: { roleId: "buyer", domainId: "procurement" },
      }).ok,
    ).toBe(false);
  });
});
