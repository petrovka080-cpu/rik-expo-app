import {
  AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT,
  getAgentWorkdayLiveEvidenceTasks,
} from "../../src/features/ai/agent/agentWorkdayLiveEvidenceRoutes";

describe("agent workday live evidence BFF contract", () => {
  it("declares a read-only live evidence route", () => {
    expect(AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT).toMatchObject({
      endpoint: "GET /agent/workday/live-evidence-tasks",
      backendFirst: true,
      roleScoped: true,
      evidenceBacked: true,
      safeReadOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      directSupabaseFromUi: false,
      externalLiveFetchEnabled: false,
      uncontrolledExternalFetch: false,
      executionEnabled: false,
      fakeCards: false,
    });
  });

  it("builds live evidence tasks through the existing workday policy", () => {
    const response = getAgentWorkdayLiveEvidenceTasks({
      auth: { userId: "director-user", role: "director" },
      input: { screenId: "ai.command_center" },
      evidenceInput: {
        warehouse: {
          rows: [{ qty_available: 0, qty_reserved: 1, qty_on_hand: 1 }],
          totalRowCount: 1,
          hasMore: false,
          dtoOnly: true,
          rawRowsExposed: false,
        },
      },
    });

    expect(response).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/workday/live-evidence-tasks",
        roleScoped: true,
        readOnly: true,
        safeReadOnly: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        uncontrolledExternalFetch: false,
        rawRowsReturned: false,
        finalExecution: 0,
      },
    });
    if (!response.ok) throw new Error("expected live evidence response");
    expect(response.data.bridge.status).toBe("loaded");
    expect(response.data.result.status).toBe("loaded");
    expect(response.data.result.cards[0]?.suggestedToolId).toBe("get_warehouse_status");
  });

  it("requires authenticated role context", () => {
    expect(
      getAgentWorkdayLiveEvidenceTasks({
        auth: null,
        evidenceInput: {},
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_WORKDAY_LIVE_EVIDENCE_AUTH_REQUIRED" },
    });
  });
});
