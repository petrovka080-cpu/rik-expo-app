import type { AiUserRole } from "../policy/aiRolePolicy";
import { draftAiWarehouseAction } from "../warehouse/aiWarehouseDraftActions";
import {
  buildAiWarehouseCopilotStatus,
  previewAiWarehouseMovements,
  previewAiWarehouseRisk,
} from "../warehouse/aiWarehouseStatusEngine";
import type {
  AiWarehouseCopilotInput,
  AiWarehouseCopilotStatusResult,
  AiWarehouseDraftAction,
  AiWarehouseMovementSummaryPreview,
  AiWarehouseRiskPreview,
} from "../warehouse/aiWarehouseCopilotTypes";
import { AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT } from "./agentWarehouseCopilotContracts";

export type AgentWarehouseCopilotAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentWarehouseCopilotRouteRequest = {
  auth: AgentWarehouseCopilotAuthContext | null;
  input?: AiWarehouseCopilotInput;
};

export type AgentWarehouseCopilotDto =
  | {
      contractId: "agent_warehouse_copilot_bff_v1";
      documentType: "agent_warehouse_status";
      endpoint: "GET /agent/warehouse/status";
      result: AiWarehouseCopilotStatusResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      stockMutated: false;
      reservationCreated: false;
      movementCreated: false;
      rawRowsReturned: false;
      source: "bff:agent_warehouse_copilot_v1";
    }
  | {
      contractId: "agent_warehouse_copilot_bff_v1";
      documentType: "agent_warehouse_movements";
      endpoint: "GET /agent/warehouse/movements";
      result: AiWarehouseMovementSummaryPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      stockMutated: false;
      reservationCreated: false;
      movementCreated: false;
      rawRowsReturned: false;
      source: "bff:agent_warehouse_copilot_v1";
    }
  | {
      contractId: "agent_warehouse_copilot_bff_v1";
      documentType: "agent_warehouse_risk_preview";
      endpoint: "POST /agent/warehouse/risk-preview";
      result: AiWarehouseRiskPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      stockMutated: false;
      reservationCreated: false;
      movementCreated: false;
      rawRowsReturned: false;
      source: "bff:agent_warehouse_copilot_v1";
    }
  | {
      contractId: "agent_warehouse_copilot_bff_v1";
      documentType: "agent_warehouse_draft_action";
      endpoint: "POST /agent/warehouse/draft-action";
      result: AiWarehouseDraftAction;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      stockMutated: false;
      reservationCreated: false;
      movementCreated: false;
      rawRowsReturned: false;
      source: "bff:agent_warehouse_copilot_v1";
    };

export type AgentWarehouseCopilotEnvelope =
  | {
      ok: true;
      data: AgentWarehouseCopilotDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_WAREHOUSE_COPILOT_AUTH_REQUIRED";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentWarehouseCopilotAuthContext | null,
): auth is AgentWarehouseCopilotAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequiredError(): AgentWarehouseCopilotEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_WAREHOUSE_COPILOT_AUTH_REQUIRED",
      message: "Agent warehouse copilot route requires authenticated role context.",
    },
  };
}

async function buildWarehouseDto(
  request: AgentWarehouseCopilotRouteRequest,
  documentType: AgentWarehouseCopilotDto["documentType"],
): Promise<AgentWarehouseCopilotEnvelope> {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  if (documentType === "agent_warehouse_movements") {
    const result = await previewAiWarehouseMovements(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "GET /agent/warehouse/movements",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        stockMutated: false,
        reservationCreated: false,
        movementCreated: false,
        rawRowsReturned: false,
        source: "bff:agent_warehouse_copilot_v1",
      },
    };
  }

  if (documentType === "agent_warehouse_risk_preview") {
    const result = await previewAiWarehouseRisk(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "POST /agent/warehouse/risk-preview",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        stockMutated: false,
        reservationCreated: false,
        movementCreated: false,
        rawRowsReturned: false,
        source: "bff:agent_warehouse_copilot_v1",
      },
    };
  }

  if (documentType === "agent_warehouse_draft_action") {
    const result = await draftAiWarehouseAction(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "POST /agent/warehouse/draft-action",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        stockMutated: false,
        reservationCreated: false,
        movementCreated: false,
        rawRowsReturned: false,
        source: "bff:agent_warehouse_copilot_v1",
      },
    };
  }

  const result = await buildAiWarehouseCopilotStatus(request);
  return {
    ok: true,
    data: {
      contractId: AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT.contractId,
      documentType: "agent_warehouse_status",
      endpoint: "GET /agent/warehouse/status",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      stockMutated: false,
      reservationCreated: false,
      movementCreated: false,
      rawRowsReturned: false,
      source: "bff:agent_warehouse_copilot_v1",
    },
  };
}

export function getAgentWarehouseStatus(
  request: AgentWarehouseCopilotRouteRequest,
): Promise<AgentWarehouseCopilotEnvelope> {
  return buildWarehouseDto(request, "agent_warehouse_status");
}

export function getAgentWarehouseMovements(
  request: AgentWarehouseCopilotRouteRequest,
): Promise<AgentWarehouseCopilotEnvelope> {
  return buildWarehouseDto(request, "agent_warehouse_movements");
}

export function previewAgentWarehouseRisk(
  request: AgentWarehouseCopilotRouteRequest,
): Promise<AgentWarehouseCopilotEnvelope> {
  return buildWarehouseDto(request, "agent_warehouse_risk_preview");
}

export function draftAgentWarehouseAction(
  request: AgentWarehouseCopilotRouteRequest,
): Promise<AgentWarehouseCopilotEnvelope> {
  return buildWarehouseDto(request, "agent_warehouse_draft_action");
}

export { AGENT_WAREHOUSE_COPILOT_BFF_CONTRACT };
