import {
  getAiAppGraphActionDto,
  getAiAppGraphScreenDto,
  resolveAiActionGraph,
} from "../appGraph/aiActionGraphResolver";
import type {
  AiActionGraphResolveResult,
  AiAppGraphActionDto,
  AiAppGraphScreenDto,
} from "../appGraph/aiAppActionTypes";
import {
  createAiCitedExternalSearchGateway,
  type AiCitedExternalSearchPreviewOutput,
} from "../externalIntel/aiCitedExternalSearchGateway";
import { createExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import { resolveExternalIntel } from "../externalIntel/externalIntelResolver";
import type {
  ExternalIntelCitation,
  ExternalIntelSearchPreviewInput,
  ExternalIntelSearchPreviewOutput,
  ExternalIntelSourcesResponse,
} from "../externalIntel/externalIntelTypes";
import { resolveInternalFirstDecision } from "../intelligence/internalFirstPolicy";
import type { AgentBffAuthContext, AgentBffShellRequest } from "./agentBffRouteShell";

export type AgentAppGraphScreenRequest = AgentBffShellRequest & {
  screenId: string;
};

export type AgentAppGraphActionRequest = AgentBffShellRequest & {
  screenId: string;
  buttonId: string;
};

export type AgentAppGraphResolveRequest = AgentBffShellRequest & {
  screenId: string;
  buttonId?: string;
  evidenceRefs?: readonly string[];
};

export type AgentIntelCompareInput = {
  domain: string;
  internalEvidenceRefs: string[];
  query: string;
  location?: string;
  sourcePolicyIds: string[];
};

export type AgentIntelCompareRequest = AgentBffShellRequest & {
  input: AgentIntelCompareInput;
};

export type AgentExternalIntelSourcesRequest = AgentBffShellRequest;

export type AgentExternalIntelSearchPreviewRequest = AgentBffShellRequest & {
  input: ExternalIntelSearchPreviewInput;
};

export type AgentExternalIntelCitedSearchPreviewRequest = AgentBffShellRequest & {
  input: ExternalIntelSearchPreviewInput;
};

export type AgentAppGraphScreenDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_screen";
  endpoint: "GET /agent/app-graph/screen/:screenId";
  result: AiAppGraphScreenDto;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentAppGraphActionDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_action";
  endpoint: "GET /agent/app-graph/action/:buttonId";
  result: AiAppGraphActionDto;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentAppGraphResolveDto = {
  contractId: "agent_app_graph_bff_v1";
  documentType: "agent_app_graph_resolve";
  endpoint: "POST /agent/app-graph/resolve";
  result: AiActionGraphResolveResult;
  roleScoped: true;
  evidenceBacked: true;
  mutationCount: 0;
  readOnly: true;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentIntelCompareOutput = {
  internalFirstSummary: string;
  externalComparisonSummary?: string;
  evidenceRefs: string[];
  citations: {
    sourceId: string;
    title: string;
    urlHash: string;
    checkedAt: string;
  }[];
  confidence: "low" | "medium" | "high";
  nextAction: "explain" | "draft" | "submit_for_approval";
  mutationCount: 0;
  providerCalled: false;
  externalLiveFetchEnabled: false;
};

export type AgentIntelCompareDto = {
  contractId: "agent_intel_compare_bff_v1";
  documentType: "agent_intel_compare";
  endpoint: "POST /agent/intel/compare";
  result: AgentIntelCompareOutput;
  roleScoped: true;
  readOnly: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelSourcesDto = {
  contractId: "agent_external_intel_bff_v1";
  documentType: "agent_external_intel_sources";
  endpoint: "GET /agent/external-intel/sources";
  result: ExternalIntelSourcesResponse;
  roleScoped: true;
  readOnly: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelSearchPreviewDto = {
  contractId: "agent_external_intel_bff_v1";
  documentType: "agent_external_intel_search_preview";
  endpoint: "POST /agent/external-intel/search/preview";
  result: ExternalIntelSearchPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: boolean;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelCitedSearchPreviewDto = {
  contractId: "agent_external_intel_bff_v1";
  documentType: "agent_external_intel_cited_search_preview";
  endpoint: "POST /agent/external-intel/cited-search-preview";
  result: AiCitedExternalSearchPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: boolean;
  dbAccessedDirectly: false;
};

export type AgentExternalIntelDto =
  | AgentExternalIntelSourcesDto
  | AgentExternalIntelSearchPreviewDto
  | AgentExternalIntelCitedSearchPreviewDto;

export type AgentAppGraphEnvelope =
  | {
      ok: true;
      data: AgentAppGraphScreenDto | AgentAppGraphActionDto | AgentAppGraphResolveDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_APP_GRAPH_AUTH_REQUIRED"
          | "AGENT_APP_GRAPH_SCREEN_BLOCKED"
          | "AGENT_APP_GRAPH_ACTION_BLOCKED";
        message: string;
      };
    };

export type AgentIntelCompareEnvelope =
  | {
      ok: true;
      data: AgentIntelCompareDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_INTEL_COMPARE_AUTH_REQUIRED" | "AGENT_INTEL_COMPARE_INVALID_INPUT";
        message: string;
      };
    };

export type AgentExternalIntelEnvelope =
  | {
      ok: true;
      data: AgentExternalIntelDto;
    }
  | {
      ok: false;
      error: {
        code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED" | "AGENT_EXTERNAL_INTEL_INVALID_INPUT";
        message: string;
      };
    };

export const AGENT_APP_GRAPH_BFF_CONTRACT = Object.freeze({
  contractId: "agent_app_graph_bff_v1",
  documentType: "agent_app_graph",
  endpoints: [
    "GET /agent/app-graph/screen/:screenId",
    "GET /agent/app-graph/action/:buttonId",
    "POST /agent/app-graph/resolve",
    "POST /agent/intel/compare",
  ],
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  externalLiveFetchEnabled: false,
  executionEnabled: false,
} as const);

export const AGENT_EXTERNAL_INTEL_BFF_CONTRACT = Object.freeze({
  contractId: "agent_external_intel_bff_v1",
  documentType: "agent_external_intel",
  endpoints: [
    "GET /agent/external-intel/sources",
    "POST /agent/external-intel/search/preview",
    "POST /agent/external-intel/cited-search-preview",
  ],
  liveEnabled: false,
  provider: "disabled",
  readOnly: true,
  roleScoped: true,
  citationsRequired: true,
  checkedAtRequired: true,
  rawHtmlReturned: false,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  finalActionAllowed: false,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
} as const);

function isAuthenticated(auth: AgentBffAuthContext | null): auth is AgentBffAuthContext {
  return auth !== null && auth.userId.length > 0 && auth.role !== "unknown";
}

function appGraphAuthRequiredError(): AgentAppGraphEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_APP_GRAPH_AUTH_REQUIRED",
      message: "Agent app graph route requires authenticated role context",
    },
  };
}

function intelCompareAuthRequiredError(): AgentIntelCompareEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_INTEL_COMPARE_AUTH_REQUIRED",
      message: "Agent intelligence compare route requires authenticated role context",
    },
  };
}

export function getAgentAppGraphScreen(
  request: AgentAppGraphScreenRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = getAiAppGraphScreenDto({
    role: request.auth.role,
    screenId: request.screenId,
  });
  if (!result) {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_SCREEN_BLOCKED",
        message: "Agent app graph screen is blocked or unknown for this role",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_screen",
      endpoint: "GET /agent/app-graph/screen/:screenId",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function getAgentAppGraphAction(
  request: AgentAppGraphActionRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = getAiAppGraphActionDto({
    role: request.auth.role,
    screenId: request.screenId,
    buttonId: request.buttonId,
  });
  if (!result) {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_ACTION_BLOCKED",
        message: "Agent app graph action is blocked or unknown for this role",
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_action",
      endpoint: "GET /agent/app-graph/action/:buttonId",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function resolveAgentAppGraph(
  request: AgentAppGraphResolveRequest,
): AgentAppGraphEnvelope {
  if (!isAuthenticated(request.auth)) return appGraphAuthRequiredError();

  const result = resolveAiActionGraph({
    role: request.auth.role,
    screenId: request.screenId,
    buttonId: request.buttonId,
    evidenceRefs: request.evidenceRefs,
  });
  if (result.status === "blocked") {
    return {
      ok: false,
      error: {
        code: "AGENT_APP_GRAPH_ACTION_BLOCKED",
        message: result.reason,
      },
    };
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_APP_GRAPH_BFF_CONTRACT.contractId,
      documentType: "agent_app_graph_resolve",
      endpoint: "POST /agent/app-graph/resolve",
      result,
      roleScoped: true,
      evidenceBacked: true,
      mutationCount: 0,
      readOnly: true,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function normalizeIntelCompareCitations(
  citations: readonly ExternalIntelCitation[],
): AgentIntelCompareOutput["citations"] {
  return citations.map((citation) => ({
    sourceId: citation.sourceId,
    title: citation.title,
    urlHash: citation.urlHash,
    checkedAt: citation.checkedAt,
  }));
}

export function compareAgentIntel(
  request: AgentIntelCompareRequest,
): AgentIntelCompareEnvelope {
  if (!isAuthenticated(request.auth)) return intelCompareAuthRequiredError();

  if (!request.input.query.trim() || !request.input.domain.trim()) {
    return {
      ok: false,
      error: {
        code: "AGENT_INTEL_COMPARE_INVALID_INPUT",
        message: "Agent intelligence compare requires a domain and query",
      },
    };
  }

  const internalFirst = resolveInternalFirstDecision({
    internalEvidenceRefs: request.input.internalEvidenceRefs,
    externalPolicyAllowed: request.input.sourcePolicyIds.length > 0,
    externalRequested: request.input.sourcePolicyIds.length > 0,
    externalLiveFetchEnabled: false,
  });
  const externalIntel = resolveExternalIntel({
    query: request.input.query,
    domain: request.input.domain,
    sourcePolicyIds: request.input.sourcePolicyIds,
    internalEvidenceRefs: internalFirst.evidenceRefs,
  });
  const citations = normalizeIntelCompareCitations(externalIntel.citations);
  const evidenceRefs = [...new Set([...internalFirst.evidenceRefs, ...externalIntel.evidenceRefs])];
  const hasEvidence = evidenceRefs.length > 0;

  return {
    ok: true,
    data: {
      contractId: "agent_intel_compare_bff_v1",
      documentType: "agent_intel_compare",
      endpoint: "POST /agent/intel/compare",
      result: {
        internalFirstSummary: internalFirst.reason,
        externalComparisonSummary: externalIntel.reason,
        evidenceRefs,
        citations,
        confidence: hasEvidence ? "medium" : "low",
        nextAction: hasEvidence ? "draft" : "explain",
        mutationCount: 0,
        providerCalled: false,
        externalLiveFetchEnabled: false,
      },
      roleScoped: true,
      readOnly: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function externalIntelAuthRequiredError(): AgentExternalIntelEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED",
      message: "Agent external intelligence route requires authenticated role context",
    },
  };
}

export function getAgentExternalIntelSources(
  request: AgentExternalIntelSourcesRequest,
): AgentExternalIntelEnvelope {
  if (!isAuthenticated(request.auth)) return externalIntelAuthRequiredError();

  const gateway = createExternalIntelGateway();
  return {
    ok: true,
    data: {
      contractId: AGENT_EXTERNAL_INTEL_BFF_CONTRACT.contractId,
      documentType: "agent_external_intel_sources",
      endpoint: "GET /agent/external-intel/sources",
      result: gateway.listSources(),
      roleScoped: true,
      readOnly: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentExternalIntelSearch(
  request: AgentExternalIntelSearchPreviewRequest,
): Promise<AgentExternalIntelEnvelope> {
  if (!isAuthenticated(request.auth)) return externalIntelAuthRequiredError();

  const gateway = createExternalIntelGateway();
  const result = await gateway.searchPreview(request.input);
  return {
    ok: true,
    data: {
      contractId: AGENT_EXTERNAL_INTEL_BFF_CONTRACT.contractId,
      documentType: "agent_external_intel_search_preview",
      endpoint: "POST /agent/external-intel/search/preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: result.providerCalled,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentExternalIntelCitedSearch(
  request: AgentExternalIntelCitedSearchPreviewRequest,
): Promise<AgentExternalIntelEnvelope> {
  if (!isAuthenticated(request.auth)) return externalIntelAuthRequiredError();

  const gateway = createAiCitedExternalSearchGateway();
  const result = await gateway.citedSearchPreview(request.input);
  return {
    ok: true,
    data: {
      contractId: AGENT_EXTERNAL_INTEL_BFF_CONTRACT.contractId,
      documentType: "agent_external_intel_cited_search_preview",
      endpoint: "POST /agent/external-intel/cited-search-preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: result.providerCalled,
      dbAccessedDirectly: false,
    },
  };
}
