import { getAiScreenRuntimeEntry } from "./aiScreenRuntimeRegistry";
import { resolveAiScreenRuntime } from "./aiScreenRuntimeResolver";
import {
  planAiScreenRuntimeAction,
  previewAiScreenRuntimeIntent,
} from "./aiScreenRuntimeActionPolicy";
import type {
  AiScreenRuntimeActionPlanInput,
  AiScreenRuntimeActionPlanOutput,
  AiScreenRuntimeIntentPreviewInput,
  AiScreenRuntimeIntentPreviewOutput,
  AiScreenRuntimeRequest,
  AiScreenRuntimeResponse,
} from "./aiScreenRuntimeTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiScreenRuntimeBffAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentScreenRuntimeRequest = {
  auth: AiScreenRuntimeBffAuthContext | null;
  input: AiScreenRuntimeRequest;
};

export type AgentScreenRuntimeIntentPreviewRequest = {
  auth: AiScreenRuntimeBffAuthContext | null;
  input: AiScreenRuntimeIntentPreviewInput;
};

export type AgentScreenRuntimeActionPlanRequest = {
  auth: AiScreenRuntimeBffAuthContext | null;
  input: AiScreenRuntimeActionPlanInput;
};

export type AgentScreenRuntimeDto = {
  contractId: "agent_screen_runtime_bff_v1";
  documentType: "agent_screen_runtime";
  endpoint: "GET /agent/screen-runtime/:screenId";
  result: AiScreenRuntimeResponse;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentScreenRuntimeIntentPreviewDto = {
  contractId: "agent_screen_runtime_bff_v1";
  documentType: "agent_screen_runtime_intent_preview";
  endpoint: "POST /agent/screen-runtime/:screenId/intent-preview";
  result: AiScreenRuntimeIntentPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentScreenRuntimeActionPlanDto = {
  contractId: "agent_screen_runtime_bff_v1";
  documentType: "agent_screen_runtime_action_plan";
  endpoint: "POST /agent/screen-runtime/:screenId/action-plan";
  result: AiScreenRuntimeActionPlanOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentScreenRuntimeEnvelope =
  | {
      ok: true;
      data:
        | AgentScreenRuntimeDto
        | AgentScreenRuntimeIntentPreviewDto
        | AgentScreenRuntimeActionPlanDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_SCREEN_RUNTIME_AUTH_REQUIRED" | "AGENT_SCREEN_RUNTIME_INVALID_INPUT";
        message: string;
      };
    };

export const AGENT_SCREEN_RUNTIME_BFF_CONTRACT = Object.freeze({
  contractId: "agent_screen_runtime_bff_v1",
  documentType: "agent_screen_runtime",
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
} as const);

function isAuthenticated(
  auth: AiScreenRuntimeBffAuthContext | null,
): auth is AiScreenRuntimeBffAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequired(): AgentScreenRuntimeEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_RUNTIME_AUTH_REQUIRED",
      message: "Agent screen runtime requires authenticated role context",
    },
  };
}

function invalidInput(message: string): AgentScreenRuntimeEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_RUNTIME_INVALID_INPUT",
      message,
    },
  };
}

export function getAgentScreenRuntime(request: AgentScreenRuntimeRequest): AgentScreenRuntimeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_RUNTIME_BFF_CONTRACT.contractId,
      documentType: "agent_screen_runtime",
      endpoint: "GET /agent/screen-runtime/:screenId",
      result: resolveAiScreenRuntime({
        auth: request.auth,
        request: request.input,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function previewAgentScreenRuntimeIntent(
  request: AgentScreenRuntimeIntentPreviewRequest,
): AgentScreenRuntimeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_RUNTIME_BFF_CONTRACT.contractId,
      documentType: "agent_screen_runtime_intent_preview",
      endpoint: "POST /agent/screen-runtime/:screenId/intent-preview",
      result: previewAiScreenRuntimeIntent({
        role: request.auth.role,
        entry: getAiScreenRuntimeEntry(request.input.screenId),
        input: request.input,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function planAgentScreenRuntimeAction(
  request: AgentScreenRuntimeActionPlanRequest,
): AgentScreenRuntimeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_RUNTIME_BFF_CONTRACT.contractId,
      documentType: "agent_screen_runtime_action_plan",
      endpoint: "POST /agent/screen-runtime/:screenId/action-plan",
      result: planAiScreenRuntimeAction({
        role: request.auth.role,
        entry: getAiScreenRuntimeEntry(request.input.screenId),
        input: request.input,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}
