import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT,
  resolveAiDocumentKnowledge,
} from "../documents/aiDocumentKnowledgeRegistry";
import type {
  AiDocumentKnowledgeAuthContext,
  AiDocumentKnowledgeQuery,
  AiDocumentKnowledgeResult,
  AiDocumentSearchPreview,
  AiDocumentSummaryPreview,
} from "../documents/aiDocumentKnowledgeTypes";
import {
  AI_DOCUMENT_SEARCH_PREVIEW_CONTRACT,
  searchAiDocumentKnowledgePreview,
  summarizeAiDocumentPreview,
} from "../documents/aiDocumentSearchPreview";
import { AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT } from "./agentDocumentKnowledgeContracts";

export type AgentDocumentKnowledgeAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AgentDocumentKnowledgeReadRouteRequest = {
  auth: AgentDocumentKnowledgeAuthContext | null;
};

export type AgentDocumentSearchRouteRequest = {
  auth: AgentDocumentKnowledgeAuthContext | null;
  input?: AiDocumentKnowledgeQuery;
};

export type AgentDocumentSummaryPreviewRouteRequest = {
  auth: AgentDocumentKnowledgeAuthContext | null;
  input: {
    documentId: string;
  };
};

export type AgentDocumentKnowledgeDto =
  | {
      contractId: "agent_document_knowledge_bff_v1";
      documentType: "agent_document_knowledge";
      endpoint: "GET /agent/documents/knowledge";
      result: AiDocumentKnowledgeResult;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      rawContentReturned: false;
      rawRowsReturned: false;
      secretsReturned: false;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      source: "bff:agent_document_knowledge_v1";
    }
  | {
      contractId: "agent_document_knowledge_bff_v1";
      documentType: "agent_document_search_preview";
      endpoint: "POST /agent/documents/search";
      result: AiDocumentSearchPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      rawContentReturned: false;
      rawRowsReturned: false;
      secretsReturned: false;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      source: "bff:agent_document_knowledge_v1";
    }
  | {
      contractId: "agent_document_knowledge_bff_v1";
      documentType: "agent_document_summary_preview";
      endpoint: "POST /agent/documents/summarize-preview";
      result: AiDocumentSummaryPreview;
      roleScoped: true;
      readOnly: true;
      evidenceBacked: true;
      rawContentReturned: false;
      rawRowsReturned: false;
      secretsReturned: false;
      mutationCount: 0;
      dbWrites: 0;
      externalLiveFetch: false;
      providerCalled: false;
      finalExecution: 0;
      source: "bff:agent_document_knowledge_v1";
    };

export type AgentDocumentKnowledgeEnvelope =
  | {
      ok: true;
      data: AgentDocumentKnowledgeDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_DOCUMENT_KNOWLEDGE_AUTH_REQUIRED"
          | "AGENT_DOCUMENT_KNOWLEDGE_INVALID_INPUT";
        message: string;
      };
    };

function toDocumentAuth(
  auth: AgentDocumentKnowledgeAuthContext | null,
): AiDocumentKnowledgeAuthContext | null {
  return auth;
}

function isAuthenticated(
  auth: AgentDocumentKnowledgeAuthContext | null,
): auth is AgentDocumentKnowledgeAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function authRequiredError(): AgentDocumentKnowledgeEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_DOCUMENT_KNOWLEDGE_AUTH_REQUIRED",
      message: "Agent document knowledge route requires authenticated role context.",
    },
  };
}

export function getAgentDocumentKnowledge(
  request: AgentDocumentKnowledgeReadRouteRequest,
): AgentDocumentKnowledgeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const result = resolveAiDocumentKnowledge(toDocumentAuth(request.auth));

  return {
    ok: true,
    data: {
      contractId: AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.contractId,
      documentType: "agent_document_knowledge",
      endpoint: "GET /agent/documents/knowledge",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      rawContentReturned: false,
      rawRowsReturned: false,
      secretsReturned: false,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      source: "bff:agent_document_knowledge_v1",
    },
  };
}

export function searchAgentDocuments(
  request: AgentDocumentSearchRouteRequest,
): AgentDocumentKnowledgeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  const result = searchAiDocumentKnowledgePreview(toDocumentAuth(request.auth), request.input ?? {});

  return {
    ok: true,
    data: {
      contractId: AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.contractId,
      documentType: "agent_document_search_preview",
      endpoint: "POST /agent/documents/search",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      rawContentReturned: false,
      rawRowsReturned: false,
      secretsReturned: false,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      source: "bff:agent_document_knowledge_v1",
    },
  };
}

export function previewAgentDocumentSummary(
  request: AgentDocumentSummaryPreviewRouteRequest,
): AgentDocumentKnowledgeEnvelope {
  if (!isAuthenticated(request.auth)) return authRequiredError();
  if (!request.input.documentId.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_DOCUMENT_KNOWLEDGE_INVALID_INPUT",
        message: "Agent document summarize preview requires a document id.",
      },
    };
  }

  const result = summarizeAiDocumentPreview(toDocumentAuth(request.auth), request.input.documentId);
  return {
    ok: true,
    data: {
      contractId: AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.contractId,
      documentType: "agent_document_summary_preview",
      endpoint: "POST /agent/documents/summarize-preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      rawContentReturned: false,
      rawRowsReturned: false,
      secretsReturned: false,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      finalExecution: 0,
      source: "bff:agent_document_knowledge_v1",
    },
  };
}

export {
  AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT,
  AI_DOCUMENT_KNOWLEDGE_REGISTRY_CONTRACT,
  AI_DOCUMENT_SEARCH_PREVIEW_CONTRACT,
};
