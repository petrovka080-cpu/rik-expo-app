import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  askAiScreenLocalAssistant,
  planAiScreenLocalAssistantAction,
  previewAiScreenLocalAssistantDraft,
  previewAiScreenLocalAssistantSubmitForApproval,
} from "../assistantOrchestrator/aiScreenLocalAssistantOrchestrator";
import { resolveAiScreenLocalAssistantContext } from "../assistantOrchestrator/aiScreenLocalContextResolver";
import type {
  AiScreenLocalAssistantActionPlanInput,
  AiScreenLocalAssistantActionPlanOutput,
  AiScreenLocalAssistantAskInput,
  AiScreenLocalAssistantAskOutput,
  AiScreenLocalAssistantContext,
  AiScreenLocalAssistantDraftPreviewInput,
  AiScreenLocalAssistantDraftPreviewOutput,
  AiScreenLocalAssistantSubmitForApprovalInput,
  AiScreenLocalAssistantSubmitPreviewOutput,
} from "../assistantOrchestrator/aiScreenLocalAssistantTypes";
import { AGENT_SCREEN_ASSISTANT_BFF_CONTRACT } from "./agentScreenAssistantContracts";

export type AgentScreenAssistantAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentScreenAssistantContextRouteRequest = {
  auth: AgentScreenAssistantAuthContext | null;
  input: {
    screenId: string;
    evidenceRefs?: readonly string[];
  };
};

export type AgentScreenAssistantAskRouteRequest = {
  auth: AgentScreenAssistantAuthContext | null;
  input: Omit<AiScreenLocalAssistantAskInput, "auth">;
};

export type AgentScreenAssistantActionPlanRouteRequest = {
  auth: AgentScreenAssistantAuthContext | null;
  input: Omit<AiScreenLocalAssistantActionPlanInput, "auth">;
};

export type AgentScreenAssistantDraftPreviewRouteRequest = {
  auth: AgentScreenAssistantAuthContext | null;
  input: Omit<AiScreenLocalAssistantDraftPreviewInput, "auth">;
};

export type AgentScreenAssistantSubmitForApprovalPreviewRouteRequest = {
  auth: AgentScreenAssistantAuthContext | null;
  input: Omit<AiScreenLocalAssistantSubmitForApprovalInput, "auth">;
};

export type AgentScreenAssistantContextDto = {
  contractId: "agent_screen_assistant_bff_v1";
  documentType: "agent_screen_assistant_context";
  endpoint: "GET /agent/screen-assistant/:screenId/context";
  result: AiScreenLocalAssistantContext;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  screenLocalScope: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
  dbAccessedDirectly: false;
};

export type AgentScreenAssistantAskDto = {
  contractId: "agent_screen_assistant_bff_v1";
  documentType: "agent_screen_assistant_ask";
  endpoint: "POST /agent/screen-assistant/:screenId/ask";
  result: AiScreenLocalAssistantAskOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  screenLocalScope: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
  dbAccessedDirectly: false;
};

export type AgentScreenAssistantActionPlanDto = {
  contractId: "agent_screen_assistant_bff_v1";
  documentType: "agent_screen_assistant_action_plan";
  endpoint: "POST /agent/screen-assistant/:screenId/action-plan";
  result: AiScreenLocalAssistantActionPlanOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  screenLocalScope: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
  dbAccessedDirectly: false;
};

export type AgentScreenAssistantDraftPreviewDto = {
  contractId: "agent_screen_assistant_bff_v1";
  documentType: "agent_screen_assistant_draft_preview";
  endpoint: "POST /agent/screen-assistant/:screenId/draft-preview";
  result: AiScreenLocalAssistantDraftPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  screenLocalScope: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
  dbAccessedDirectly: false;
};

export type AgentScreenAssistantSubmitForApprovalPreviewDto = {
  contractId: "agent_screen_assistant_bff_v1";
  documentType: "agent_screen_assistant_submit_for_approval_preview";
  endpoint: "POST /agent/screen-assistant/:screenId/submit-for-approval-preview";
  result: AiScreenLocalAssistantSubmitPreviewOutput;
  approvalRequired: true;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  screenLocalScope: true;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  externalLiveFetch: false;
  dbAccessedDirectly: false;
};

export type AgentScreenAssistantEnvelope =
  | {
      ok: true;
      data:
        | AgentScreenAssistantContextDto
        | AgentScreenAssistantAskDto
        | AgentScreenAssistantActionPlanDto
        | AgentScreenAssistantDraftPreviewDto
        | AgentScreenAssistantSubmitForApprovalPreviewDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_SCREEN_ASSISTANT_AUTH_REQUIRED" | "AGENT_SCREEN_ASSISTANT_INVALID_INPUT";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentScreenAssistantAuthContext | null,
): auth is AgentScreenAssistantAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequired(): AgentScreenAssistantEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_ASSISTANT_AUTH_REQUIRED",
      message: "Agent screen assistant requires authenticated role context",
    },
  };
}

function invalidInput(message: string): AgentScreenAssistantEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_SCREEN_ASSISTANT_INVALID_INPUT",
      message,
    },
  };
}

function assertScreenId(screenId: string): AgentScreenAssistantEnvelope | null {
  return screenId.trim().length > 0 ? null : invalidInput("screenId is required");
}

export function getAgentScreenAssistantContext(
  request: AgentScreenAssistantContextRouteRequest,
): AgentScreenAssistantEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  const invalid = assertScreenId(request.input.screenId);
  if (invalid) return invalid;

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ASSISTANT_BFF_CONTRACT.contractId,
      documentType: "agent_screen_assistant_context",
      endpoint: "GET /agent/screen-assistant/:screenId/context",
      result: resolveAiScreenLocalAssistantContext({
        auth: request.auth,
        screenId: request.input.screenId,
        evidenceRefs: request.input.evidenceRefs,
      }),
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
  };
}

export function askAgentScreenAssistant(
  request: AgentScreenAssistantAskRouteRequest,
): AgentScreenAssistantEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  const invalid = assertScreenId(request.input.screenId);
  if (invalid) return invalid;

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ASSISTANT_BFF_CONTRACT.contractId,
      documentType: "agent_screen_assistant_ask",
      endpoint: "POST /agent/screen-assistant/:screenId/ask",
      result: askAiScreenLocalAssistant({
        ...request.input,
        auth: request.auth,
      }),
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
  };
}

export function planAgentScreenAssistantAction(
  request: AgentScreenAssistantActionPlanRouteRequest,
): AgentScreenAssistantEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  const invalid = assertScreenId(request.input.screenId);
  if (invalid) return invalid;

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ASSISTANT_BFF_CONTRACT.contractId,
      documentType: "agent_screen_assistant_action_plan",
      endpoint: "POST /agent/screen-assistant/:screenId/action-plan",
      result: planAiScreenLocalAssistantAction({
        ...request.input,
        auth: request.auth,
      }),
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
  };
}

export function previewAgentScreenAssistantDraft(
  request: AgentScreenAssistantDraftPreviewRouteRequest,
): AgentScreenAssistantEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  const invalid = assertScreenId(request.input.screenId);
  if (invalid) return invalid;

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ASSISTANT_BFF_CONTRACT.contractId,
      documentType: "agent_screen_assistant_draft_preview",
      endpoint: "POST /agent/screen-assistant/:screenId/draft-preview",
      result: previewAiScreenLocalAssistantDraft({
        ...request.input,
        auth: request.auth,
      }),
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
  };
}

export function previewAgentScreenAssistantSubmitForApproval(
  request: AgentScreenAssistantSubmitForApprovalPreviewRouteRequest,
): AgentScreenAssistantEnvelope {
  if (!isAuthenticated(request.auth)) return authRequired();
  const invalid = assertScreenId(request.input.screenId);
  if (invalid) return invalid;

  return {
    ok: true,
    data: {
      contractId: AGENT_SCREEN_ASSISTANT_BFF_CONTRACT.contractId,
      documentType: "agent_screen_assistant_submit_for_approval_preview",
      endpoint: "POST /agent/screen-assistant/:screenId/submit-for-approval-preview",
      result: previewAiScreenLocalAssistantSubmitForApproval({
        ...request.input,
        auth: request.auth,
      }),
      approvalRequired: true,
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
  };
}

export { AGENT_SCREEN_ASSISTANT_BFF_CONTRACT };
