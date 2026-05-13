import {
  AGENT_SCREEN_ACTION_BFF_CONTRACT,
  getAgentScreenActions,
  planAgentScreenAction,
  previewAgentScreenActionIntent,
} from "../../src/features/ai/agent/agentScreenActionRoutes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI screen action BFF contracts", () => {
  it("declares read-only screen-action intelligence endpoints", () => {
    expect(AGENT_SCREEN_ACTION_BFF_CONTRACT).toMatchObject({
      endpoints: [
        "GET /agent/screen-actions/:screenId",
        "POST /agent/screen-actions/:screenId/intent-preview",
        "POST /agent/screen-actions/:screenId/action-plan",
      ],
      readOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      directDatabaseAccess: 0,
      externalLiveFetchEnabled: false,
      modelProviderImports: 0,
      executionEnabled: false,
      finalMutationAllowed: false,
      forbiddenActionsExecutable: false,
    });
  });

  it("requires auth and returns role-scoped actions without executing anything", () => {
    expect(getAgentScreenActions({ auth: null, input: { screenId: "buyer.requests" } })).toMatchObject({
      ok: false,
      error: { code: "AGENT_SCREEN_ACTION_AUTH_REQUIRED" },
    });

    expect(getAgentScreenActions({ auth: buyerAuth, input: { screenId: "buyer.requests" } })).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/screen-actions/:screenId",
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        providerCalled: false,
        externalLiveFetch: false,
        result: {
          safeReadActions: expect.any(Array),
          draftActions: expect.any(Array),
          approvalRequiredActions: expect.any(Array),
          forbiddenActions: expect.any(Array),
          fakeAiAnswer: false,
          hardcodedAiResponse: false,
        },
      },
    });
  });

  it("previews intents and plans through BFF without live mutations", () => {
    expect(
      previewAgentScreenActionIntent({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", intent: "submit_for_approval" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-actions/:screenId/intent-preview",
        result: {
          status: "preview",
          deterministic: true,
          mutationCount: 0,
          dbWrites: 0,
          externalLiveFetch: false,
        },
      },
    });

    expect(
      planAgentScreenAction({
        auth: buyerAuth,
        input: { screenId: "buyer.requests", actionId: "buyer.requests.submit_request" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-actions/:screenId/action-plan",
        result: {
          status: "planned",
          planMode: "approval_required",
          executable: false,
          mutationCount: 0,
          dbWrites: 0,
          finalExecution: 0,
        },
      },
    });
  });
});
