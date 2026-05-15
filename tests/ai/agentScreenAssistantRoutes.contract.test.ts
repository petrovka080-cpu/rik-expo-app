import {
  AGENT_SCREEN_ASSISTANT_BFF_CONTRACT,
  askAgentScreenAssistant,
  getAgentScreenAssistantContext,
  planAgentScreenAssistantAction,
  previewAgentScreenAssistantDraft,
  previewAgentScreenAssistantSubmitForApproval,
} from "../../src/features/ai/agent/agentScreenAssistantRoutes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("Agent screen assistant BFF routes", () => {
  it("declares screen-local role assistant endpoints as no-mutation BFF contracts", () => {
    expect(AGENT_SCREEN_ASSISTANT_BFF_CONTRACT).toMatchObject({
      endpoints: [
        "GET /agent/screen-assistant/:screenId/context",
        "POST /agent/screen-assistant/:screenId/ask",
        "POST /agent/screen-assistant/:screenId/action-plan",
        "POST /agent/screen-assistant/:screenId/draft-preview",
        "POST /agent/screen-assistant/:screenId/submit-for-approval-preview",
      ],
      screenLocalScopeRequired: true,
      crossScreenNonDirectorCode: "FORBIDDEN_CROSS_SCREEN_ACTION",
      crossScreenDirectorControlMode: "HANDOFF_PLAN_ONLY",
      readOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      internalFirst: true,
      mutationCount: 0,
      dbWrites: 0,
      directDatabaseAccess: 0,
      externalLiveFetchEnabled: false,
      modelProviderImports: 0,
      executionEnabled: false,
      finalMutationAllowed: false,
    });
  });

  it("requires auth and returns screen-local assistant context", () => {
    expect(getAgentScreenAssistantContext({ auth: null, input: { screenId: "buyer.requests" } })).toMatchObject({
      ok: false,
      error: { code: "AGENT_SCREEN_ASSISTANT_AUTH_REQUIRED" },
    });

    expect(getAgentScreenAssistantContext({ auth: buyerAuth, input: { screenId: "buyer.requests" } })).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/screen-assistant/:screenId/context",
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        screenLocalScope: true,
        mutationCount: 0,
        dbWrites: 0,
        providerCalled: false,
        externalLiveFetch: false,
        dbAccessedDirectly: false,
      },
    });
  });

  it("previews ask, action plan, draft, and approval without execution", () => {
    expect(
      askAgentScreenAssistant({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", message: "context" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-assistant/:screenId/ask",
        result: { status: "answered", mutationCount: 0, providerCalled: false },
      },
    });

    expect(
      planAgentScreenAssistantAction({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", actionId: "buyer.requests.submit_request" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-assistant/:screenId/action-plan",
        result: { status: "planned", executable: false, finalExecution: 0 },
      },
    });

    expect(
      previewAgentScreenAssistantDraft({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", actionId: "buyer.requests.draft_request" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-assistant/:screenId/draft-preview",
        result: { status: "draft_preview", persisted: false, submitted: false },
      },
    });

    expect(
      previewAgentScreenAssistantSubmitForApproval({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", actionId: "buyer.requests.submit_request" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-assistant/:screenId/submit-for-approval-preview",
        result: { status: "submit_for_approval_preview", submitted: false, executed: false },
      },
    });
  });
});
