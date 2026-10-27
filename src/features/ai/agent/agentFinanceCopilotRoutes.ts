import type { AiUserRole } from "../policy/aiRolePolicy";
import { draftAiFinanceSummary } from "../finance/aiFinanceDraftSummary";
import { buildAiFinanceCopilotSummary, previewAiFinanceRisk } from "../finance/aiFinanceRiskEngine";
import type {
  AiFinanceCopilotInput,
  AiFinanceCopilotSummaryResult,
  AiFinanceDraftSummary,
  AiFinanceRiskPreview,
} from "../finance/aiFinanceCopilotTypes";
import { AGENT_FINANCE_COPILOT_BFF_CONTRACT } from "./agentFinanceCopilotContracts";

export type AgentFinanceCopilotAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentFinanceCopilotRouteRequest = {
  auth: AgentFinanceCopilotAuthContext | null;
  input?: AiFinanceCopilotInput;
};

export type AgentFinanceCopilotDto =
  | {
      contractId: "agent_finance_copilot_bff_v1";
      documentType: "agent_finance_summary";
      endpoint: "GET /agent/finance/summary";
      result: AiFinanceCopilotSummaryResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      paymentCreated: false;
      postingCreated: false;
      invoiceMutated: false;
      rawRowsReturned: false;
      source: "bff:agent_finance_copilot_v1";
    }
  | {
      contractId: "agent_finance_copilot_bff_v1";
      documentType: "agent_finance_debts";
      endpoint: "GET /agent/finance/debts";
      result: AiFinanceCopilotSummaryResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      paymentCreated: false;
      postingCreated: false;
      invoiceMutated: false;
      rawRowsReturned: false;
      source: "bff:agent_finance_copilot_v1";
    }
  | {
      contractId: "agent_finance_copilot_bff_v1";
      documentType: "agent_finance_risk_preview";
      endpoint: "POST /agent/finance/risk-preview";
      result: AiFinanceRiskPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      paymentCreated: false;
      postingCreated: false;
      invoiceMutated: false;
      rawRowsReturned: false;
      source: "bff:agent_finance_copilot_v1";
    }
  | {
      contractId: "agent_finance_copilot_bff_v1";
      documentType: "agent_finance_draft_summary";
      endpoint: "POST /agent/finance/draft-summary";
      result: AiFinanceDraftSummary;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      paymentCreated: false;
      postingCreated: false;
      invoiceMutated: false;
      rawRowsReturned: false;
      source: "bff:agent_finance_copilot_v1";
    };

export type AgentFinanceCopilotEnvelope =
  | {
      ok: true;
      data: AgentFinanceCopilotDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_FINANCE_COPILOT_AUTH_REQUIRED";
        message: string;
      };
    };

function isAuthenticated(
  auth: AgentFinanceCopilotAuthContext | null,
): auth is AgentFinanceCopilotAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequiredError(): AgentFinanceCopilotEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_FINANCE_COPILOT_AUTH_REQUIRED",
      message: "Agent finance copilot route requires authenticated role context.",
    },
  };
}

async function buildFinanceDto(
  request: AgentFinanceCopilotRouteRequest,
  documentType: AgentFinanceCopilotDto["documentType"],
  endpoint: AgentFinanceCopilotDto["endpoint"],
): Promise<AgentFinanceCopilotEnvelope> {
  if (!isAuthenticated(request.auth)) return authRequiredError();

  if (documentType === "agent_finance_risk_preview") {
    const result = await previewAiFinanceRisk(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_FINANCE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: endpoint as "POST /agent/finance/risk-preview",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        paymentCreated: false,
        postingCreated: false,
        invoiceMutated: false,
        rawRowsReturned: false,
        source: "bff:agent_finance_copilot_v1",
      },
    };
  }

  if (documentType === "agent_finance_draft_summary") {
    const result = await draftAiFinanceSummary(request);
    return {
      ok: true,
      data: {
        contractId: AGENT_FINANCE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: endpoint as "POST /agent/finance/draft-summary",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        paymentCreated: false,
        postingCreated: false,
        invoiceMutated: false,
        rawRowsReturned: false,
        source: "bff:agent_finance_copilot_v1",
      },
    };
  }

  const result = await buildAiFinanceCopilotSummary(request);
  if (documentType === "agent_finance_summary") {
    return {
      ok: true,
      data: {
        contractId: AGENT_FINANCE_COPILOT_BFF_CONTRACT.contractId,
        documentType,
        endpoint: "GET /agent/finance/summary",
        result,
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        mutationCount: 0,
        dbWrites: 0,
        externalLiveFetch: false,
        providerCalled: false,
        finalExecution: 0,
        paymentCreated: false,
        postingCreated: false,
        invoiceMutated: false,
        rawRowsReturned: false,
        source: "bff:agent_finance_copilot_v1",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_FINANCE_COPILOT_BFF_CONTRACT.contractId,
      documentType: "agent_finance_debts",
      endpoint: "GET /agent/finance/debts",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      paymentCreated: false,
      postingCreated: false,
      invoiceMutated: false,
      rawRowsReturned: false,
      source: "bff:agent_finance_copilot_v1",
    },
  };
}

export function getAgentFinanceSummary(
  request: AgentFinanceCopilotRouteRequest,
): Promise<AgentFinanceCopilotEnvelope> {
  return buildFinanceDto(request, "agent_finance_summary", "GET /agent/finance/summary");
}

export function getAgentFinanceDebts(
  request: AgentFinanceCopilotRouteRequest,
): Promise<AgentFinanceCopilotEnvelope> {
  return buildFinanceDto(request, "agent_finance_debts", "GET /agent/finance/debts");
}

export function previewAgentFinanceRisk(
  request: AgentFinanceCopilotRouteRequest,
): Promise<AgentFinanceCopilotEnvelope> {
  return buildFinanceDto(request, "agent_finance_risk_preview", "POST /agent/finance/risk-preview");
}

export function draftAgentFinanceSummary(
  request: AgentFinanceCopilotRouteRequest,
): Promise<AgentFinanceCopilotEnvelope> {
  return buildFinanceDto(request, "agent_finance_draft_summary", "POST /agent/finance/draft-summary");
}

export { AGENT_FINANCE_COPILOT_BFF_CONTRACT };
