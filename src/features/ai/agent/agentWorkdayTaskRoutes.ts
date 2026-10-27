import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  buildAiWorkdayTasks,
  AI_WORKDAY_TASK_ENGINE_CONTRACT,
} from "../workday/aiWorkdayTaskEngine";
import type {
  AiWorkdayTaskActionPlan,
  AiWorkdayTaskEngineInput,
  AiWorkdayTaskEngineResult,
  AiWorkdayTaskPreview,
} from "../workday/aiWorkdayTaskTypes";
import { AGENT_WORKDAY_TASK_BFF_CONTRACT } from "./agentWorkdayTaskContracts";

export type AgentWorkdayTaskAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentWorkdayTaskReadRouteRequest = {
  auth: AgentWorkdayTaskAuthContext | null;
  input?: {
    screenId?: string;
    limit?: number;
  };
  sourceCards?: AiWorkdayTaskEngineInput["sourceCards"];
  runtimeEvidence?: AiWorkdayTaskEngineInput["runtimeEvidence"];
};

export type AgentWorkdayTaskPreviewRouteRequest = {
  auth: AgentWorkdayTaskAuthContext | null;
  input: {
    taskId: string;
    screenId?: string;
  };
  sourceCards?: AiWorkdayTaskEngineInput["sourceCards"];
  runtimeEvidence?: AiWorkdayTaskEngineInput["runtimeEvidence"];
};

export type AgentWorkdayTaskActionPlanRouteRequest = AgentWorkdayTaskPreviewRouteRequest;

export type AgentWorkdayTaskDto =
  | {
      contractId: "agent_workday_task_bff_v1";
      documentType: "agent_workday_tasks";
      endpoint: "GET /agent/workday/tasks";
      result: AiWorkdayTaskEngineResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      rawRowsReturned: false;
      finalExecution: 0;
      source: "bff:agent_workday_task_v1";
    }
  | {
      contractId: "agent_workday_task_bff_v1";
      documentType: "agent_workday_task_preview";
      endpoint: "POST /agent/workday/tasks/:taskId/preview";
      result: AiWorkdayTaskPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      rawRowsReturned: false;
      finalExecution: 0;
      source: "bff:agent_workday_task_v1";
    }
  | {
      contractId: "agent_workday_task_bff_v1";
      documentType: "agent_workday_task_action_plan";
      endpoint: "POST /agent/workday/tasks/:taskId/action-plan";
      result: AiWorkdayTaskActionPlan;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      rawRowsReturned: false;
      finalExecution: 0;
      source: "bff:agent_workday_task_v1";
    };

export type AgentWorkdayTaskEnvelope =
  | {
      ok: true;
      data: AgentWorkdayTaskDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_WORKDAY_TASK_AUTH_REQUIRED"
          | "AGENT_WORKDAY_TASK_INVALID_INPUT"
          | "AGENT_WORKDAY_TASK_NOT_FOUND";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentWorkdayTaskAuthContext | null,
): auth is AgentWorkdayTaskAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequiredError(): AgentWorkdayTaskEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_WORKDAY_TASK_AUTH_REQUIRED",
      message: "Agent workday task route requires authenticated role context.",
    },
  };
}

function findTask(
  request: AgentWorkdayTaskPreviewRouteRequest,
): { runtime: AiWorkdayTaskEngineResult; task: AiWorkdayTaskEngineResult["cards"][number] | null } {
  const runtime = buildAiWorkdayTasks({
    auth: request.auth,
    screenId: request.input.screenId ?? "ai.command_center",
    sourceCards: request.sourceCards,
    runtimeEvidence: request.runtimeEvidence,
  });
  const task = runtime.cards.find((card) => card.taskId === request.input.taskId) ?? null;
  return { runtime, task };
}

export function getAgentWorkdayTasks(
  request: AgentWorkdayTaskReadRouteRequest,
): AgentWorkdayTaskEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  const result = buildAiWorkdayTasks({
    auth: request.auth,
    screenId: request.input?.screenId ?? "ai.command_center",
    limit: request.input?.limit,
    sourceCards: request.sourceCards,
    runtimeEvidence: request.runtimeEvidence,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_WORKDAY_TASK_BFF_CONTRACT.contractId,
      documentType: "agent_workday_tasks",
      endpoint: "GET /agent/workday/tasks",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      rawRowsReturned: false,
      finalExecution: 0,
      source: "bff:agent_workday_task_v1",
    },
  };
}

export function previewAgentWorkdayTask(
  request: AgentWorkdayTaskPreviewRouteRequest,
): AgentWorkdayTaskEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  if (!request.input.taskId.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_WORKDAY_TASK_INVALID_INPUT",
        message: "Agent workday task preview requires a task id.",
      },
    };
  }

  const { runtime, task } = findTask(request);
  const result: AiWorkdayTaskPreview = task
    ? {
        status: "preview",
        taskId: task.taskId,
        title: task.title,
        summary: task.summary,
        deterministic: true,
        evidenceRefs: task.evidenceRefs,
        suggestedToolId: task.suggestedToolId,
        suggestedMode: task.suggestedMode,
        approvalRequired: task.approvalRequired,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        finalExecution: 0,
      }
    : {
        status: runtime.status === "blocked" ? "blocked" : "empty",
        taskId: null,
        title: "No proactive workday task",
        summary: runtime.blockedReason ?? runtime.emptyState?.reason ?? "Task was not found.",
        deterministic: true,
        evidenceRefs: [],
        suggestedToolId: null,
        suggestedMode: "forbidden",
        approvalRequired: false,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        finalExecution: 0,
      };

  return {
    ok: true,
    data: {
      contractId: AGENT_WORKDAY_TASK_BFF_CONTRACT.contractId,
      documentType: "agent_workday_task_preview",
      endpoint: "POST /agent/workday/tasks/:taskId/preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      rawRowsReturned: false,
      finalExecution: 0,
      source: "bff:agent_workday_task_v1",
    },
  };
}

export function planAgentWorkdayTaskAction(
  request: AgentWorkdayTaskActionPlanRouteRequest,
): AgentWorkdayTaskEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  if (!request.input.taskId.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_WORKDAY_TASK_INVALID_INPUT",
        message: "Agent workday task action plan requires a task id.",
      },
    };
  }

  const { runtime, task } = findTask(request);
  const result: AiWorkdayTaskActionPlan = task
    ? {
        status: "planned",
        taskId: task.taskId,
        planMode: task.suggestedMode,
        classification: task.classification,
        suggestedToolId: task.suggestedToolId,
        executable: false,
        approvalRequired: task.approvalRequired,
        evidenceRefs: task.evidenceRefs,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        finalExecution: 0,
        reason: task.policyReason,
      }
    : {
        status: runtime.status === "blocked" ? "blocked" : "empty",
        taskId: null,
        planMode: "forbidden",
        classification: runtime.status === "blocked" ? "FORBIDDEN_RECOMMENDATION_BLOCKED" : "INSUFFICIENT_EVIDENCE_BLOCKED",
        suggestedToolId: null,
        executable: false,
        approvalRequired: false,
        evidenceRefs: [],
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        finalExecution: 0,
        reason: runtime.blockedReason ?? runtime.emptyState?.reason ?? "Task was not found.",
      };

  return {
    ok: true,
    data: {
      contractId: AGENT_WORKDAY_TASK_BFF_CONTRACT.contractId,
      documentType: "agent_workday_task_action_plan",
      endpoint: "POST /agent/workday/tasks/:taskId/action-plan",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      rawRowsReturned: false,
      finalExecution: 0,
      source: "bff:agent_workday_task_v1",
    },
  };
}

export { AGENT_WORKDAY_TASK_BFF_CONTRACT, AI_WORKDAY_TASK_ENGINE_CONTRACT };
