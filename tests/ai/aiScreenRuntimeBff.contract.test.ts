import {
  AGENT_SCREEN_RUNTIME_BFF_CONTRACT,
  getAgentScreenRuntime,
  planAgentScreenRuntimeAction,
  previewAgentScreenRuntimeIntent,
} from "../../src/features/ai/screenRuntime/aiScreenRuntimeBff";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI screen runtime BFF contracts", () => {
  it("declares read-only route contracts", () => {
    expect(AGENT_SCREEN_RUNTIME_BFF_CONTRACT).toMatchObject({
      endpoints: [
        "GET /agent/screen-runtime/:screenId",
        "POST /agent/screen-runtime/:screenId/intent-preview",
        "POST /agent/screen-runtime/:screenId/action-plan",
      ],
      readOnly: true,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      directDatabaseAccess: 0,
      modelProviderImports: 0,
      executionEnabled: false,
      finalMutationAllowed: false,
    });
  });

  it("requires auth and returns role-scoped screen runtime", () => {
    expect(getAgentScreenRuntime({ auth: null, input: { screenId: "buyer.main" } })).toMatchObject({
      ok: false,
      error: { code: "AGENT_SCREEN_RUNTIME_AUTH_REQUIRED" },
    });

    expect(getAgentScreenRuntime({ auth: buyerAuth, input: { screenId: "buyer.main" } })).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/screen-runtime/:screenId",
        roleScoped: true,
        readOnly: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
  });

  it("previews intents and action plans without executing final actions", () => {
    expect(
      previewAgentScreenRuntimeIntent({
        auth: buyerAuth,
        input: { screenId: "buyer.main", intent: "draft" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-runtime/:screenId/intent-preview",
        result: { allowed: true, finalMutationAllowed: false, mutationCount: 0 },
      },
    });

    expect(
      planAgentScreenRuntimeAction({
        auth: buyerAuth,
        input: { screenId: "buyer.main", action: "submit_for_approval" },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/screen-runtime/:screenId/action-plan",
        result: {
          planMode: "approval_boundary",
          finalMutationAllowed: false,
          executed: false,
          mutationCount: 0,
        },
      },
    });
  });
});
