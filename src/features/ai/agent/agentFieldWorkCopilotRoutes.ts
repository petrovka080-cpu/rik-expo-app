import type { AiUserRole } from "../policy/aiRolePolicy";
import { draftAiContractorAct, planAiFieldAction } from "../field/aiContractorActDraftEngine";
import {
  buildAiFieldContext,
  draftAiForemanReport,
} from "../field/aiForemanReportDraftEngine";
import type {
  AiContractorActDraft,
  AiFieldActionPlan,
  AiFieldContextResult,
  AiFieldWorkCopilotInput,
  AiForemanReportDraft,
} from "../field/aiFieldWorkCopilotTypes";
import { AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT } from "./agentFieldWorkCopilotContracts";

export type AgentFieldWorkCopilotAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentFieldWorkCopilotRouteRequest = {
  auth: AgentFieldWorkCopilotAuthContext | null;
  input?: AiFieldWorkCopilotInput;
};

export type AgentFieldWorkCopilotDto =
  | {
      contractId: "agent_field_work_copilot_bff_v1";
      documentType: "agent_field_context";
      endpoint: "GET /agent/field/context";
      result: AiFieldContextResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      reportPublished: false;
      actSigned: false;
      contractorConfirmation: false;
      paymentMutation: false;
      warehouseMutation: false;
      rawRowsReturned: false;
      source: "bff:agent_field_work_copilot_v1";
    }
  | {
      contractId: "agent_field_work_copilot_bff_v1";
      documentType: "agent_field_draft_report";
      endpoint: "POST /agent/field/draft-report";
      result: AiForemanReportDraft;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      reportPublished: false;
      actSigned: false;
      contractorConfirmation: false;
      paymentMutation: false;
      warehouseMutation: false;
      rawRowsReturned: false;
      source: "bff:agent_field_work_copilot_v1";
    }
  | {
      contractId: "agent_field_work_copilot_bff_v1";
      documentType: "agent_field_draft_act";
      endpoint: "POST /agent/field/draft-act";
      result: AiContractorActDraft;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      reportPublished: false;
      actSigned: false;
      contractorConfirmation: false;
      paymentMutation: false;
      warehouseMutation: false;
      rawRowsReturned: false;
      source: "bff:agent_field_work_copilot_v1";
    }
  | {
      contractId: "agent_field_work_copilot_bff_v1";
      documentType: "agent_field_action_plan";
      endpoint: "POST /agent/field/action-plan";
      result: AiFieldActionPlan;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      reportPublished: false;
      actSigned: false;
      contractorConfirmation: false;
      paymentMutation: false;
      warehouseMutation: false;
      rawRowsReturned: false;
      source: "bff:agent_field_work_copilot_v1";
    };

export type AgentFieldWorkCopilotEnvelope =
  | {
      ok: true;
      data: AgentFieldWorkCopilotDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_FIELD_WORK_COPILOT_AUTH_REQUIRED";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentFieldWorkCopilotAuthContext | null,
): auth is AgentFieldWorkCopilotAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequiredError(): AgentFieldWorkCopilotEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_FIELD_WORK_COPILOT_AUTH_REQUIRED",
      message: "Agent field work copilot route requires authenticated role context.",
    },
  };
}

async function buildFieldDto(
  request: AgentFieldWorkCopilotRouteRequest,
  documentType: AgentFieldWorkCopilotDto["documentType"],
): Promise<AgentFieldWorkCopilotEnvelope> {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  if (documentType === "agent_field_draft_report") {
    const result = await draftAiForemanReport(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "POST /agent/field/draft-report",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        reportPublished: false,
        actSigned: false,
        contractorConfirmation: false,
        paymentMutation: false,
        warehouseMutation: false,
        rawRowsReturned: false,
        source: "bff:agent_field_work_copilot_v1",
      },
    };
  }

  if (documentType === "agent_field_draft_act") {
    const result = await draftAiContractorAct(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "POST /agent/field/draft-act",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        reportPublished: false,
        actSigned: false,
        contractorConfirmation: false,
        paymentMutation: false,
        warehouseMutation: false,
        rawRowsReturned: false,
        source: "bff:agent_field_work_copilot_v1",
      },
    };
  }

  if (documentType === "agent_field_action_plan") {
    const result = await planAiFieldAction(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "POST /agent/field/action-plan",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        reportPublished: false,
        actSigned: false,
        contractorConfirmation: false,
        paymentMutation: false,
        warehouseMutation: false,
        rawRowsReturned: false,
        source: "bff:agent_field_work_copilot_v1",
      },
    };
  }

  const result = await buildAiFieldContext(request);
  return {
    ok: true,
    data: {
      contractId: AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT.contractId,
      documentType: "agent_field_context",
      endpoint: "GET /agent/field/context",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      reportPublished: false,
      actSigned: false,
      contractorConfirmation: false,
      paymentMutation: false,
      warehouseMutation: false,
      rawRowsReturned: false,
      source: "bff:agent_field_work_copilot_v1",
    },
  };
}

export function getAgentFieldContext(
  request: AgentFieldWorkCopilotRouteRequest,
): Promise<AgentFieldWorkCopilotEnvelope> {
  return buildFieldDto(request, "agent_field_context");
}

export function draftAgentFieldReport(
  request: AgentFieldWorkCopilotRouteRequest,
): Promise<AgentFieldWorkCopilotEnvelope> {
  return buildFieldDto(request, "agent_field_draft_report");
}

export function draftAgentFieldAct(
  request: AgentFieldWorkCopilotRouteRequest,
): Promise<AgentFieldWorkCopilotEnvelope> {
  return buildFieldDto(request, "agent_field_draft_act");
}

export function planAgentFieldAction(
  request: AgentFieldWorkCopilotRouteRequest,
): Promise<AgentFieldWorkCopilotEnvelope> {
  return buildFieldDto(request, "agent_field_action_plan");
}

export { AGENT_FIELD_WORK_COPILOT_BFF_CONTRACT };
