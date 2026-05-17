import { AI_PERSISTENT_APPROVAL_QUEUE_READINESS } from "../approval/aiApprovalTypes";
import { previewAiExternalSupplierCandidatesCanary } from "../externalIntel/aiExternalSupplierCandidatePreview";
import {
  previewAiExternalSupplierCitationPreview,
  type AiExternalSupplierCitationPreviewOutput,
} from "../externalIntel/aiExternalSupplierCitationPreview";
import type { ExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import {
  AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT,
  runAiProcurementLiveSupplierChain,
  type AiProcurementLiveSupplierChainInput,
  type AiProcurementLiveSupplierChainResult,
} from "../procurement/aiProcurementLiveChain";
import {
  buildAiProcurementDecisionCard,
  buildAiProcurementDecisionCardWithDraftPreview,
  type AiProcurementDecisionCard,
} from "../procurement/aiProcurementDecisionCard";
import {
  buildAiProcurementRequestUnderstandingFromContext,
  understandAiProcurementRequest,
  type AiProcurementRequestUnderstanding,
} from "../procurement/aiProcurementRequestUnderstanding";
import {
  rankAiInternalSuppliers,
  type AiInternalSupplierRankRequest,
  type AiInternalSupplierRankResult,
} from "../procurement/aiInternalSupplierRanker";
import type {
  ExternalSupplierCandidatesInput,
  ExternalSupplierCandidatesOutput,
  ProcurementApprovalPreviewInput,
  ProcurementApprovalPreviewOutput,
  ProcurementDraftPreviewOutput,
  ProcurementRequestContext,
  ProcurementRequestContextResolverInput,
  ProcurementSafeRequestSnapshot,
  SupplierMatchPreviewInput,
  SupplierMatchPreviewOutput,
} from "../procurement/procurementContextTypes";
import {
  buildProcurementDraftPreview,
  type ProcurementDraftPlanBuilderRequest,
} from "../procurement/procurementDraftPlanBuilder";
import { resolveProcurementRequestContext } from "../procurement/procurementRequestContextResolver";
import {
  previewProcurementSupplierMatch,
  type ProcurementSupplierMatchEngineRequest,
} from "../procurement/procurementSupplierMatchEngine";
import { previewProcurementCopilotSubmitForApproval } from "../procurementCopilot/procurementCopilotActionPolicy";
import { buildProcurementCopilotDraftPreview } from "../procurementCopilot/procurementCopilotDraftBridge";
import {
  buildProcurementCopilotPlan,
  resolveProcurementCopilotContext,
} from "../procurementCopilot/procurementCopilotPlanEngine";
import type {
  ProcurementCopilotContext,
  ProcurementCopilotDraftPreview,
  ProcurementCopilotDraftPreviewInput,
  ProcurementCopilotPlan,
  ProcurementCopilotPlanInput,
  ProcurementCopilotSubmitForApprovalPreview,
  ProcurementCopilotSubmitPreviewInput,
} from "../procurementCopilot/procurementCopilotTypes";
import type { AgentBffAuthContext, AgentBffShellRequest } from "./agentBffRouteShell";

export type AgentProcurementRequestContextRequest = AgentBffShellRequest & {
  requestId: string;
  screenId: string;
  cursor?: string | null;
  organizationId?: string;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type AgentProcurementRequestUnderstandingRequest = AgentProcurementRequestContextRequest;

export type AgentProcurementInternalSupplierRankRequest = AgentBffShellRequest &
  Omit<AiInternalSupplierRankRequest, "auth">;

export type AgentProcurementDecisionCardRequest = AgentBffShellRequest & {
  context: ProcurementRequestContext;
  understanding?: AiProcurementRequestUnderstanding | null;
  supplierRank?: AiInternalSupplierRankResult | null;
};

export type AgentProcurementSupplierMatchRequest = AgentBffShellRequest & {
  input: SupplierMatchPreviewInput;
  context?: ProcurementRequestContext | null;
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
  searchCatalogItems?: ProcurementSupplierMatchEngineRequest["searchCatalogItems"];
  listSuppliers?: ProcurementSupplierMatchEngineRequest["listSuppliers"];
};

export type AgentProcurementExternalSupplierCandidatesRequest = AgentBffShellRequest & {
  input: ExternalSupplierCandidatesInput;
  sourcePolicyIds?: readonly string[];
  externalGateway?: ExternalIntelGateway;
};

export type AgentProcurementExternalSupplierPreviewRequest =
  AgentProcurementExternalSupplierCandidatesRequest;

export type AgentProcurementDraftRequestPreviewRequest = AgentBffShellRequest & {
  input: ProcurementDraftPlanBuilderRequest["input"];
};

export type AgentProcurementInternalFirstDraftRequestPreviewRequest = AgentBffShellRequest & {
  input?: ProcurementDraftPlanBuilderRequest["input"];
  context?: ProcurementRequestContext | null;
  understanding?: AiProcurementRequestUnderstanding | null;
  supplierRank?: AiInternalSupplierRankResult | null;
};

export type AgentProcurementSubmitForApprovalRequest = AgentBffShellRequest & {
  input: ProcurementApprovalPreviewInput;
};

export type AgentProcurementLiveSupplierChainRequest = AgentBffShellRequest &
  Omit<AiProcurementLiveSupplierChainInput, "auth">;

export type AgentProcurementCopilotContextRequest = AgentBffShellRequest & {
  requestId: string;
  screenId: string;
  cursor?: string | null;
  organizationId?: string;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type AgentProcurementCopilotPlanRequest = AgentBffShellRequest & {
  input: ProcurementCopilotPlanInput;
};

export type AgentProcurementCopilotDraftPreviewRequest = AgentBffShellRequest & {
  input: ProcurementCopilotDraftPreviewInput;
};

export type AgentProcurementCopilotSubmitForApprovalPreviewRequest = AgentBffShellRequest & {
  input: ProcurementCopilotSubmitPreviewInput;
};

export type AgentProcurementRequestContextDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_request_context";
  endpoint: "GET /agent/procurement/request-context/:requestId";
  result: ProcurementRequestContext;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementRequestUnderstandingDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_request_understanding";
  endpoint: "GET /agent/procurement/request-understanding/:requestId";
  result: AiProcurementRequestUnderstanding;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  internalFirst: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementInternalSupplierRankDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_internal_supplier_rank";
  endpoint: "POST /agent/procurement/internal-supplier-rank";
  result: AiInternalSupplierRankResult;
  toolBoundary: "search_catalog_and_compare_suppliers_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  internalFirst: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementDecisionCardDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_decision_card";
  endpoint: "POST /agent/procurement/decision-card";
  result: AiProcurementDecisionCard;
  runtimeBoundary: "internal_first_supplier_rank_risk_decision_card";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  approvalRequired: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementSupplierMatchDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_supplier_match_preview";
  endpoint: "POST /agent/procurement/supplier-match/preview";
  result: SupplierMatchPreviewOutput;
  toolBoundary: "search_catalog_and_compare_suppliers_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementExternalSupplierCandidatesDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_external_supplier_candidates_preview";
  endpoint: "POST /agent/procurement/external-supplier-candidates/preview";
  result: ExternalSupplierCandidatesOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementExternalSupplierPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_external_supplier_preview";
  endpoint: "POST /agent/procurement/external-supplier-preview";
  result: AiExternalSupplierCitationPreviewOutput;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementDraftRequestPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_draft_request_preview";
  endpoint: "POST /agent/procurement/draft-request/preview";
  result: ProcurementDraftPreviewOutput;
  toolBoundary: "draft_request_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementInternalFirstDraftRequestPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_internal_first_draft_request_preview";
  endpoint: "POST /agent/procurement/draft-request-preview";
  result: ProcurementDraftPreviewOutput;
  toolBoundary: "draft_request_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  internalFirst: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementSubmitForApprovalDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_submit_for_approval";
  endpoint: "POST /agent/procurement/submit-for-approval";
  result: ProcurementApprovalPreviewOutput;
  approvalRequired: true;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotContextDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_context";
  endpoint: "GET /agent/procurement/copilot/context";
  result: ProcurementCopilotContext;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotPlanDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_plan";
  endpoint: "POST /agent/procurement/copilot/plan";
  result: ProcurementCopilotPlan;
  runtimeBoundary: "internal_context_marketplace_compare_external_status_draft_approval";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotDraftPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_draft_preview";
  endpoint: "POST /agent/procurement/copilot/draft-preview";
  result: ProcurementCopilotDraftPreview;
  toolBoundary: "draft_request_only";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementCopilotSubmitForApprovalPreviewDto = {
  contractId: "agent_procurement_bff_v1";
  documentType: "agent_procurement_copilot_submit_for_approval_preview";
  endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview";
  result: ProcurementCopilotSubmitForApprovalPreview;
  approvalRequired: true;
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementLiveSupplierChainDto = {
  contractId: "agent_procurement_bff_v1";
  documentType:
    | "agent_procurement_live_supplier_chain_preview"
    | "agent_procurement_live_supplier_chain_draft"
    | "agent_procurement_live_supplier_chain_submit_for_approval";
  endpoint:
    | "POST /agent/procurement/live-supplier-chain/preview"
    | "POST /agent/procurement/live-supplier-chain/draft"
    | "POST /agent/procurement/live-supplier-chain/submit-for-approval";
  result: AiProcurementLiveSupplierChainResult;
  runtimeBoundary: "internal_context_marketplace_compare_draft_approval";
  roleScoped: true;
  readOnly: true;
  evidenceBacked: true;
  approvalRequired: true;
  mutationCount: 0;
  providerCalled: false;
  dbAccessedDirectly: false;
};

export type AgentProcurementDto =
  | AgentProcurementRequestContextDto
  | AgentProcurementRequestUnderstandingDto
  | AgentProcurementInternalSupplierRankDto
  | AgentProcurementDecisionCardDto
  | AgentProcurementSupplierMatchDto
  | AgentProcurementExternalSupplierCandidatesDto
  | AgentProcurementExternalSupplierPreviewDto
  | AgentProcurementDraftRequestPreviewDto
  | AgentProcurementInternalFirstDraftRequestPreviewDto
  | AgentProcurementSubmitForApprovalDto
  | AgentProcurementLiveSupplierChainDto
  | AgentProcurementCopilotContextDto
  | AgentProcurementCopilotPlanDto
  | AgentProcurementCopilotDraftPreviewDto
  | AgentProcurementCopilotSubmitForApprovalPreviewDto;

export type AgentProcurementEnvelope =
  | {
      ok: true;
      data: AgentProcurementDto;
    }
  | {
      ok: false;
      error: {
        code:
          | "AGENT_PROCUREMENT_AUTH_REQUIRED"
          | "AGENT_PROCUREMENT_INVALID_INPUT";
        message: string;
      };
    };

export const AGENT_PROCUREMENT_BFF_CONTRACT = Object.freeze({
  contractId: "agent_procurement_bff_v1",
  documentType: "agent_procurement",
  endpoints: [
    "GET /agent/procurement/request-context/:requestId",
    "GET /agent/procurement/request-understanding/:requestId",
    "POST /agent/procurement/internal-supplier-rank",
    "POST /agent/procurement/decision-card",
    "POST /agent/procurement/supplier-match/preview",
    "POST /agent/procurement/external-supplier-candidates/preview",
    "POST /agent/procurement/external-supplier-preview",
    "POST /agent/procurement/draft-request/preview",
    "POST /agent/procurement/draft-request-preview",
    "POST /agent/procurement/submit-for-approval",
    "POST /agent/procurement/live-supplier-chain/preview",
    "POST /agent/procurement/live-supplier-chain/draft",
    "POST /agent/procurement/live-supplier-chain/submit-for-approval",
    "GET /agent/procurement/copilot/context",
    "POST /agent/procurement/copilot/plan",
    "POST /agent/procurement/copilot/draft-preview",
    "POST /agent/procurement/copilot/submit-for-approval-preview",
  ],
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  directDatabaseAccess: 0,
  modelProviderImports: 0,
  externalLiveFetchEnabled: false,
  finalActionExecutionEnabled: false,
  supplierSelectionFinalized: false,
  liveSupplierChainContract: AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT.contractId,
} as const);

function isAuthenticated(auth: AgentBffAuthContext | null): auth is AgentBffAuthContext {
  return auth !== null && auth.userId.length > 0 && auth.role !== "unknown";
}

function procurementAuthRequiredError(): AgentProcurementEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_PROCUREMENT_AUTH_REQUIRED",
      message: "Agent procurement route requires authenticated role context",
    },
  };
}

function procurementInvalidInputError(message: string): AgentProcurementEnvelope {
  return {
    ok: false,
    error: {
      code: "AGENT_PROCUREMENT_INVALID_INPUT",
      message,
    },
  };
}

export function getAgentProcurementRequestContext(
  request: AgentProcurementRequestContextRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const resolverInput: ProcurementRequestContextResolverInput = {
    auth: request.auth,
    requestId: request.requestId,
    screenId: request.screenId,
    cursor: request.cursor,
    organizationId: request.organizationId,
    requestSnapshot: request.requestSnapshot,
  };
  const result = resolveProcurementRequestContext(resolverInput);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_request_context",
      endpoint: "GET /agent/procurement/request-context/:requestId",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function getAgentProcurementRequestUnderstanding(
  request: AgentProcurementRequestUnderstandingRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = understandAiProcurementRequest({
    auth: request.auth,
    requestId: request.requestId,
    screenId: request.screenId,
    cursor: request.cursor,
    organizationId: request.organizationId,
    requestSnapshot: request.requestSnapshot,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_request_understanding",
      endpoint: "GET /agent/procurement/request-understanding/:requestId",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      internalFirst: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementInternalSupplierRank(
  request: AgentProcurementInternalSupplierRankRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await rankAiInternalSuppliers({
    auth: request.auth,
    context: request.context,
    location: request.location,
    limit: request.limit,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_internal_supplier_rank",
      endpoint: "POST /agent/procurement/internal-supplier-rank",
      result,
      toolBoundary: "search_catalog_and_compare_suppliers_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      internalFirst: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function previewAgentProcurementDecisionCard(
  request: AgentProcurementDecisionCardRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = buildAiProcurementDecisionCard({
    context: request.context,
    understanding:
      request.understanding ?? buildAiProcurementRequestUnderstandingFromContext(request.context),
    supplierRank: request.supplierRank ?? null,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_decision_card",
      endpoint: "POST /agent/procurement/decision-card",
      result,
      runtimeBoundary: "internal_first_supplier_rank_risk_decision_card",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      approvalRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementSupplierMatch(
  request: AgentProcurementSupplierMatchRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await previewProcurementSupplierMatch({
    auth: request.auth,
    context: request.context,
    input: request.input,
    externalRequested: request.externalRequested,
    externalSourcePolicyIds: request.externalSourcePolicyIds,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_supplier_match_preview",
      endpoint: "POST /agent/procurement/supplier-match/preview",
      result: result.output,
      toolBoundary: "search_catalog_and_compare_suppliers_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementExternalSupplierCandidates(
  request: AgentProcurementExternalSupplierCandidatesRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await previewAiExternalSupplierCandidatesCanary({
    auth: request.auth,
    input: request.input,
    sourcePolicyIds: request.sourcePolicyIds,
    gateway: request.externalGateway,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_external_supplier_candidates_preview",
      endpoint: "POST /agent/procurement/external-supplier-candidates/preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementExternalSupplierPreview(
  request: AgentProcurementExternalSupplierPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await previewAiExternalSupplierCitationPreview({
    auth: request.auth,
    input: request.input,
    sourcePolicyIds: request.sourcePolicyIds,
    gateway: request.externalGateway,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_external_supplier_preview",
      endpoint: "POST /agent/procurement/external-supplier-preview",
      result,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementDraftRequest(
  request: AgentProcurementDraftRequestPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementDraftPreview({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_draft_request_preview",
      endpoint: "POST /agent/procurement/draft-request/preview",
      result: result.output,
      toolBoundary: "draft_request_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function blockedInternalFirstDraftPreview(
  reason: string,
  evidenceRefs: readonly string[] = [],
): ProcurementDraftPreviewOutput {
  return {
    status: "blocked",
    draftPreview: {
      title: "Procurement draft preview",
      items: [],
      notes: [],
    },
    missingFields: [reason],
    riskFlags: ["draft_blocked"],
    evidenceRefs: evidenceRefs.filter((ref) => ref.trim().length > 0),
    requiresApproval: true,
    nextAction: "submit_for_approval",
  };
}

export async function previewAgentProcurementInternalFirstDraftRequest(
  request: AgentProcurementInternalFirstDraftRequestPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  let result: ProcurementDraftPreviewOutput;
  if (request.input) {
    const draft = await buildProcurementDraftPreview({
      auth: request.auth,
      input: request.input,
    });
    result = draft.output;
  } else {
    if (!request.context) {
      return procurementInvalidInputError(
        "Internal-first draft preview requires either a draft input or procurement context.",
      );
    }
    const withDraft = await buildAiProcurementDecisionCardWithDraftPreview({
      auth: request.auth,
      context: request.context,
      understanding:
        request.understanding ??
        buildAiProcurementRequestUnderstandingFromContext(request.context),
      supplierRank: request.supplierRank ?? null,
    });
    result =
      withDraft.draftPreview ??
      blockedInternalFirstDraftPreview("decision_card_not_ready", withDraft.card.evidenceRefs);
  }

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_internal_first_draft_request_preview",
      endpoint: "POST /agent/procurement/draft-request-preview",
      result,
      toolBoundary: "draft_request_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      internalFirst: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

function blockedProcurementApproval(
  input: ProcurementApprovalPreviewInput,
): ProcurementApprovalPreviewOutput {
  return {
    status: "blocked",
    blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
    approvalRequired: true,
    idempotencyRequired: true,
    auditRequired: true,
    redactedPayloadOnly: true,
    persisted: false,
    mutationCount: 0,
    finalExecution: 0,
    evidenceRefs: input.evidenceRefs.filter((ref) => ref.trim().length > 0),
  };
}

export function submitAgentProcurementForApproval(
  request: AgentProcurementSubmitForApprovalRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = AI_PERSISTENT_APPROVAL_QUEUE_READINESS.persistentBackendFound
    ? blockedProcurementApproval(request.input)
    : blockedProcurementApproval(request.input);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_submit_for_approval",
      endpoint: "POST /agent/procurement/submit-for-approval",
      result,
      approvalRequired: true,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

async function runAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
  documentType: AgentProcurementLiveSupplierChainDto["documentType"],
  endpoint: AgentProcurementLiveSupplierChainDto["endpoint"],
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await runAiProcurementLiveSupplierChain({
    auth: request.auth,
    requestId: request.requestId,
    screenId: request.screenId,
    organizationId: request.organizationId,
    cursor: request.cursor,
    requestSnapshot: request.requestSnapshot,
    externalRequested: request.externalRequested,
    externalSourcePolicyIds: request.externalSourcePolicyIds,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
    externalGateway: request.externalGateway,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType,
      endpoint,
      result,
      runtimeBoundary: "internal_context_marketplace_compare_draft_approval",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      approvalRequired: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_preview",
    "POST /agent/procurement/live-supplier-chain/preview",
  );
}

export async function draftAgentProcurementLiveSupplierChain(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_draft",
    "POST /agent/procurement/live-supplier-chain/draft",
  );
}

export async function submitAgentProcurementLiveSupplierChainForApproval(
  request: AgentProcurementLiveSupplierChainRequest,
): Promise<AgentProcurementEnvelope> {
  return runAgentProcurementLiveSupplierChain(
    request,
    "agent_procurement_live_supplier_chain_submit_for_approval",
    "POST /agent/procurement/live-supplier-chain/submit-for-approval",
  );
}

export function getAgentProcurementCopilotContext(
  request: AgentProcurementCopilotContextRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = resolveProcurementCopilotContext({
    auth: request.auth,
    input: {
      requestId: request.requestId,
      screenId: request.screenId,
      cursor: request.cursor,
      organizationId: request.organizationId,
      requestSnapshot: request.requestSnapshot,
    },
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_context",
      endpoint: "GET /agent/procurement/copilot/context",
      result: result.context,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementCopilotPlan(
  request: AgentProcurementCopilotPlanRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementCopilotPlan({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_plan",
      endpoint: "POST /agent/procurement/copilot/plan",
      result: result.plan,
      runtimeBoundary: "internal_context_marketplace_compare_external_status_draft_approval",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export async function previewAgentProcurementCopilotDraft(
  request: AgentProcurementCopilotDraftPreviewRequest,
): Promise<AgentProcurementEnvelope> {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = await buildProcurementCopilotDraftPreview({
    auth: request.auth,
    input: request.input,
  });

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_draft_preview",
      endpoint: "POST /agent/procurement/copilot/draft-preview",
      result,
      toolBoundary: "draft_request_only",
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}

export function previewAgentProcurementCopilotSubmitForApproval(
  request: AgentProcurementCopilotSubmitForApprovalPreviewRequest,
): AgentProcurementEnvelope {
  if (!isAuthenticated(request.auth)) return procurementAuthRequiredError();

  const result = previewProcurementCopilotSubmitForApproval(request.input);

  return {
    ok: true,
    data: {
      contractId: AGENT_PROCUREMENT_BFF_CONTRACT.contractId,
      documentType: "agent_procurement_copilot_submit_for_approval_preview",
      endpoint: "POST /agent/procurement/copilot/submit-for-approval-preview",
      result,
      approvalRequired: true,
      roleScoped: true,
      readOnly: true,
      evidenceBacked: true,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    },
  };
}
