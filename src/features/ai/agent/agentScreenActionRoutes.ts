import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  planAiScreenAction,
  previewAiScreenActionIntent,
  resolveAiScreenActions,
} from "../screenActions/aiScreenActionResolver";
import type {
  AiScreenActionIntentPreviewInput,
  AiScreenActionIntentPreviewOutput,
  AiScreenActionMapOutput,
  AiScreenActionPlanInput,
  AiScreenActionPlanOutput,
  AiScreenActionRequest,
} from "../screenActions/aiScreenActionTypes";
import { AGENT_SCREEN_ACTION_BFF_CONTRACT } from "./agentScreenActionContracts";

export type AgentScreenActionAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentScreenActionReadRouteRequest = {
  auth: AgentScreenActionAuthContext | null;
  input: AiScreenActionRequest;
};

export type AgentScreenActionIntentPreviewRouteRequest = {
  auth: AgentScreenActionAuthContext | null;
  input: AiScreenActionIntentPreviewInput;
};

export type AgentScreenActionPlanRouteRequest = {
  auth: AgentScreenActionAuthContext | null;
  input: AiScreenActionPlanInput;
};

export type AgentScreenActionDto = {
  contractId: "agent_screen_action_bff_v1";
  documentType: "agent_screen_actions";
  endpoint: "GET /agent/screen-actions/:screenId";
  result: AiScreenActionMapOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
};

export type AgentScreenActionIntentPreviewDto = {
  contractId: "agent_screen_action_bff_v1";
  documentType: "agent_screen_action_intent_preview";
  endpoint: "POST /agent/screen-actions/:screenId/intent-preview";
  result: AiScreenActionIntentPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
};

export type AgentScreenActionPlanDto = {
  contractId: "agent_screen_action_bff_v1";
  documentType: "agent_screen_action_plan";
  endpoint: "POST /agent/screen-actions/:screenId/action-plan";
  result: AiScreenActionPlanOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
};

export type AgentScreenActionEnvelope =
  | {
      ok: true;
      data:
        | AgentScreenActionDto
        | AgentScreenActionIntentPreviewDto
        | AgentScreenActionPlanDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_SCREEN_ACTION_AUTH_REQUIRED" | "AGENT_SCREEN_ACTION_INVALID_INPUT";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentScreenActionAuthContext | null,
): auth is AgentScreenActionAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequired(): AgentScreenActionEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_ACTION_AUTH_REQUIRED",
      message: "Agent screen actions require authenticated role context",
    },
  };
}

function invalidInput(message: string): AgentScreenActionEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_ACTION_INVALID_INPUT",
      message,
    },
  };
}

export function getAgentScreenActions(
  request: AgentScreenActionReadRouteRequest,
): AgentScreenActionEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ACTION_BFF_CONTRACT.contractId,
      documentType: "agent_screen_actions",
      endpoint: "GET /agent/screen-actions/:screenId",
      result: resolveAiScreenActions({
        auth: request.auth,
        screenId: request.input.screenId,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      externalLiveFetch: false,
    },
  };
}

export function previewAgentScreenActionIntent(
  request: AgentScreenActionIntentPreviewRouteRequest,
): AgentScreenActionEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ACTION_BFF_CONTRACT.contractId,
      documentType: "agent_screen_action_intent_preview",
      endpoint: "POST /agent/screen-actions/:screenId/intent-preview",
      result: previewAiScreenActionIntent({
        auth: request.auth,
        input: request.input,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      externalLiveFetch: false,
    },
  };
}

export function planAgentScreenAction(
  request: AgentScreenActionPlanRouteRequest,
): AgentScreenActionEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  if (!request.input.screenId.trim()) return invalidInput("screenId is required");

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ACTION_BFF_CONTRACT.contractId,
      documentType: "agent_screen_action_plan",
      endpoint: "POST /agent/screen-actions/:screenId/action-plan",
      result: planAiScreenAction({
        auth: request.auth,
        input: request.input,
      }),
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      providerCalled: false,
      externalLiveFetch: false,
    },
  };
}

export { AGENT_SCREEN_ACTION_BFF_CONTRACT };
