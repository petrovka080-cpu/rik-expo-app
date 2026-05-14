import { AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT } from "../../src/features/ai/agent/agentFieldWorkCopilotContracts";
import {
  draftAgentFieldAct,
  draftAgentFieldReport,
  getAgentFieldContext,
  planAgentFieldAction,
} from "../../src/features/ai/agent/agentFieldWorkCopilotRoutes";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import {
  AI_FIELD_ROLE_SCOPE_CONTRACT,
  availableAiFieldTools,
  canUseAiFieldCopilot,
  resolveAiFieldRoleScope,
  toolKnownForAiFieldCopilot,
} from "../../src/features/ai/field/aiFieldRoleScope";

describe("AI field role scope", () => {
  it("allows director/control, foreman, and contractor while denying unrelated roles", () => {
    expect(AI_FIELD_ROLE_SCOPE_CONTRACT).toMatchObject({
      roleScoped: true,
      contractorOwnScopeEnforced: true,
      roleIsolationE2eClaimed: false,
      mutationCount: 0,
      fakeRoleIsolationClaimed: false,
    });

    expect(canUseAiFieldCopilot("director")).toBe(true);
    expect(canUseAiFieldCopilot("control")).toBe(true);
    expect(canUseAiFieldCopilot("foreman")).toBe(true);
    expect(canUseAiFieldCopilot("contractor")).toBe(true);
    expect(canUseAiFieldCopilot("buyer")).toBe(false);
    expect(canUseAiFieldCopilot("accountant")).toBe(false);
    expect(canUseAiFieldCopilot("warehouse")).toBe(false);
  });

  it("enforces contractor own scope and keeps all referenced tools known", () => {
    const contractorOwn = resolveAiFieldRoleScope({
      role: "contractor",
      context: { scope: "contractor_own_scope", sourceEvidenceRefs: ["field:evidence:redacted"] },
    });
    const contractorLeak = resolveAiFieldRoleScope({
      role: "contractor",
      context: { scope: "foreman_project_scope", sourceEvidenceRefs: ["field:evidence:redacted"] },
    });

    expect(contractorOwn).toMatchObject({
      allowed: true,
      roleScope: "contractor_own_scope",
      contractorOwnScopeEnforced: true,
    });
    expect(contractorLeak).toMatchObject({
      allowed: false,
      roleScope: "contractor_own_scope",
      contractorOwnScopeEnforced: true,
    });
    expect(availableAiFieldTools("contractor").every(toolKnownForAiFieldCopilot)).toBe(true);
    expect(availableAiFieldTools("foreman")).toEqual(
      expect.arrayContaining(["get_action_status", "draft_report", "draft_act", "submit_for_approval"]),
    );
  });

  it("mounts field work BFF routes as read-only, auth-required, role-filtered contracts", async () => {
    expect(AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT).toMatchObject({
      backendFirst: true,
      roleScoped: true,
      contractorOwnScopeEnforced: true,
      mutationCount: 0,
      dbWrites: 0,
      directSupabaseFromUi: false,
      executionEnabled: false,
      fakeFieldCards: false,
    });

    const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.field."),
    );
    expect(routes.map((route) => route.endpoint)).toEqual([
      "GET /agent/field/context",
      "POST /agent/field/draft-report",
      "POST /agent/field/draft-act",
      "POST /agent/field/action-plan",
    ]);
    expect(routes.every((route) => route.authRequired && route.roleFiltered)).toBe(true);
    expect(routes.every((route) => route.mutates === false)).toBe(true);
    expect(routes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
    expect(routes.every((route) => route.callsModelProvider === false)).toBe(true);

    const auth = { userId: "field-user", role: "foreman" } as const;
    const input = {
      fieldContext: {
        scope: "foreman_project_scope" as const,
        objectId: "object:redacted",
        subcontractId: "subcontract:redacted",
        workSummary: "Redacted field summary.",
        sourceEvidenceRefs: ["field:evidence:redacted"],
        workItems: [{ name: "redacted work", quantity: 1, unit: "pcs" }],
      },
    };

    const context = await getAgentFieldContext({ auth, input });
    const report = await draftAgentFieldReport({ auth, input });
    const act = await draftAgentFieldAct({ auth, input });
    const plan = await planAgentFieldAction({ auth, input: { ...input, intent: "draft_act" } });

    expect(context.ok).toBe(true);
    expect(report.ok).toBe(true);
    expect(act.ok).toBe(true);
    expect(plan.ok).toBe(true);
    if (
      !context.ok ||
      !report.ok ||
      !act.ok ||
      !plan.ok ||
      plan.data.documentType !== "agent_field_action_plan"
    ) {
      return;
    }

    expect(context.data.mutationCount).toBe(0);
    expect(report.data.result.status).toBe("draft");
    expect(act.data.result.status).toBe("draft");
    expect(plan.data.result.suggestedMode).toBe("draft_only");
    expect(act.data.actSigned).toBe(false);
    expect(act.data.paymentMutation).toBe(false);
  });
});
