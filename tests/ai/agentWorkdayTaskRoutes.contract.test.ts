import {
  AGENT_WORKDAY_TASK_BFF_CONTRACT,
  getAgentWorkdayTasks,
  planAgentWorkdayTaskAction,
  previewAgentWorkdayTask,
} from "../../src/features/ai/agent/agentWorkdayTaskRoutes";
import { aiCommandCenterTaskCards } from "./aiCommandCenter.fixture";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("agent workday task BFF contracts", () => {
  it("declares read-only proactive workday task endpoints", () => {
    expect(AGENT_WORKDAY_TASK_BFF_CONTRACT).toMatchObject({
      endpoints: [
        "GET /agent/workday/tasks",
        "POST /agent/workday/tasks/:taskId/preview",
        "POST /agent/workday/tasks/:taskId/action-plan",
      ],
      backendFirst: true,
      roleScoped: true,
      evidenceBacked: true,
      readOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      directDatabaseAccess: 0,
      directSupabaseFromUi: false,
      externalLiveFetchEnabled: false,
      mobileExternalFetch: false,
      modelProviderImports: 0,
      executionEnabled: false,
      finalExecution: 0,
      fakeCards: false,
      hardcodedAiAnswer: false,
    });
  });

  it("requires auth and returns role-scoped cards without live mutations", () => {
    expect(getAgentWorkdayTasks({ auth: null })).toMatchObject({
      ok: false,
      error: { code: "AGENT_WORKDAY_TASK_AUTH_REQUIRED" },
    });

    const response = getAgentWorkdayTasks({
      auth: directorAuth,
      sourceCards: aiCommandCenterTaskCards,
      input: { screenId: "ai.command_center" },
    });

    expect(response).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/workday/tasks",
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        rawRowsReturned: false,
        finalExecution: 0,
        result: {
          status: "loaded",
          mutationCount: 0,
          dbWrites: 0,
          externalLiveFetch: false,
          fakeCards: false,
        },
      },
    });
  });

  it("previews and plans deterministic task actions without execution", () => {
    const taskId = "workday.submit-request-1";

    expect(
      previewAgentWorkdayTask({
        auth: directorAuth,
        sourceCards: aiCommandCenterTaskCards,
        input: { screenId: "ai.command_center", taskId },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/workday/tasks/:taskId/preview",
        result: {
          status: "preview",
          deterministic: true,
          suggestedToolId: "submit_for_approval",
          suggestedMode: "approval_required",
          approvalRequired: true,
          mutationCount: 0,
          dbWrites: 0,
          externalLiveFetch: false,
          finalExecution: 0,
        },
      },
    });

    expect(
      planAgentWorkdayTaskAction({
        auth: directorAuth,
        sourceCards: aiCommandCenterTaskCards,
        input: { screenId: "ai.command_center", taskId },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/workday/tasks/:taskId/action-plan",
        result: {
          status: "planned",
          planMode: "approval_required",
          executable: false,
          mutationCount: 0,
          dbWrites: 0,
          externalLiveFetch: false,
          finalExecution: 0,
        },
      },
    });
  });
});
