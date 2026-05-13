import type { AiUserRole } from "../policy/aiRolePolicy";
import { buildAiWorkdayTasks } from "../workday/aiWorkdayTaskEngine";
import {
  buildAiWorkdayRuntimeEvidenceFromSafeReads,
  type AiWorkdayLiveEvidenceBridgeInput,
  type AiWorkdayLiveEvidenceBridgeResult,
} from "../workday/aiWorkdayLiveEvidenceBridge";
import type { AiWorkdayTaskEngineResult } from "../workday/aiWorkdayTaskTypes";
import { AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT } from "./agentWorkdayLiveEvidenceContracts";

export type AgentWorkdayLiveEvidenceAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentWorkdayLiveEvidenceRouteRequest = {
  auth: AgentWorkdayLiveEvidenceAuthContext | null;
  input?: {
    screenId?: string;
    limit?: number;
  };
  evidenceInput: AiWorkdayLiveEvidenceBridgeInput;
};

export type AgentWorkdayLiveEvidenceDto = {
  contractId: "agent_workday_live_evidence_bff_v1";
  documentType: "agent_workday_live_evidence_tasks";
  endpoint: "GET /agent/workday/live-evidence-tasks";
  bridge: AiWorkdayLiveEvidenceBridgeResult;
  result: AiWorkdayTaskEngineResult;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  safeReadOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  uncontrolledExternalFetch: false;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  finalExecution: 0;
  source: "bff:agent_workday_live_evidence_v1";
};

export type AgentWorkdayLiveEvidenceEnvelope =
  | {
      ok: true;
      data: AgentWorkdayLiveEvidenceDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_WORKDAY_LIVE_EVIDENCE_AUTH_REQUIRED";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentWorkdayLiveEvidenceAuthContext | null,
): auth is AgentWorkdayLiveEvidenceAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export function getAgentWorkdayLiveEvidenceTasks(
  request: AgentWorkdayLiveEvidenceRouteRequest,
): AgentWorkdayLiveEvidenceEnvelope {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "AGENT_WORKDAY_LIVE_EVIDENCE_AUTH_REQUIRED",
        message: "Agent workday live evidence route requires authenticated role context.",
      },
    };
  }

  const bridge = buildAiWorkdayRuntimeEvidenceFromSafeReads(request.evidenceInput);
  const result = buildAiWorkdayTasks({
    auth: request.auth,
    screenId: request.input?.screenId ?? "ai.command_center",
    limit: request.input?.limit,
    runtimeEvidence: bridge.runtimeEvidence,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT.contractId,
      documentType: AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT.documentType,
      endpoint: AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT.endpoint,
      bridge,
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      safeReadOnly: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      uncontrolledExternalFetch: false,
      providerCalled: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      finalExecution: 0,
      source: "bff:agent_workday_live_evidence_v1",
    },
  };
}

export { AGENT_WORKDAY_LIVE_EVIDENCE_BFF_CONTRACT };
