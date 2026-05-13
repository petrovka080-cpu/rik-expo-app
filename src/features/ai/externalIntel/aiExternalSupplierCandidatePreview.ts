import { createExternalIntelGateway, type ExternalIntelGateway } from "./ExternalIntelGateway";
import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "./externalSourceRegistry";
import { validateAiExternalCitations } from "./aiExternalCitationPolicy";
import { resolveAiExternalSearchPolicy } from "./aiExternalSearchPolicy";
import type {
  ExternalSupplierCandidatesInput,
  ExternalSupplierCandidatesOutput,
  ProcurementAuthContext,
} from "../procurement/procurementContextTypes";
import { canUseProcurementRequestContext } from "../procurement/procurementRequestContextResolver";

export const AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT = Object.freeze({
  contractId: "ai_external_supplier_candidate_canary_v1",
  internalFirstRequired: true,
  marketplaceCheckRequired: true,
  citationsRequired: true,
  externalLiveFetchDefault: false,
  previewOnly: true,
  mutationCount: 0,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  finalActionAllowed: false,
  fakeSuppliersAllowed: false,
} as const);

export type AiExternalSupplierCandidatePreviewRequest = {
  auth: ProcurementAuthContext | null;
  input: ExternalSupplierCandidatesInput;
  sourcePolicyIds?: readonly string[];
  gateway?: ExternalIntelGateway;
};

function candidateQuery(input: ExternalSupplierCandidatesInput): string {
  const labels = input.items
    .map((item) => item.materialLabel?.trim())
    .filter((label): label is string => Boolean(label))
    .slice(0, 5);
  const location = input.location?.trim();
  return [...labels, location ? `location:${location}` : null]
    .filter((part): part is string => part !== null)
    .join(" ")
    .slice(0, 240);
}

export async function previewAiExternalSupplierCandidatesCanary(
  request: AiExternalSupplierCandidatePreviewRequest,
): Promise<ExternalSupplierCandidatesOutput> {
  if (!request.auth || !canUseProcurementRequestContext(request.auth.role)) {
    return {
      status: "blocked",
      internalFirstSummary: "External supplier candidate preview is blocked by role scope.",
      candidates: [],
      citations: [],
      recommendationBoundary: "External candidates cannot create suppliers, orders, requests, or confirmations.",
      requiresApprovalForAction: true,
      finalActionAllowed: false,
      mutationCount: 0,
    };
  }

  const sourcePolicyIds = [...(request.sourcePolicyIds ?? PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS)];
  const policy = resolveAiExternalSearchPolicy({
    domain: "procurement",
    query: candidateQuery(request.input) || "procurement material",
    location: request.input.location,
    internalEvidenceRefs: [...request.input.internalEvidenceRefs],
    marketplaceChecked: request.input.marketplaceChecked,
    sourcePolicyIds,
    limit: request.input.limit,
  });
  if (!policy.allowed) {
    return {
      status: "blocked",
      internalFirstSummary: "Internal request evidence and marketplace check are required before external supplier candidates.",
      candidates: [],
      citations: [],
      recommendationBoundary: "External candidates cannot create suppliers, orders, requests, or confirmations.",
      requiresApprovalForAction: true,
      finalActionAllowed: false,
      mutationCount: 0,
    };
  }

  const gateway = request.gateway ?? createExternalIntelGateway();
  const preview = await gateway.searchPreview({
    domain: "procurement",
    query: candidateQuery(request.input) || "procurement material",
    location: request.input.location,
    internalEvidenceRefs: [...request.input.internalEvidenceRefs],
    marketplaceChecked: request.input.marketplaceChecked,
    sourcePolicyIds,
    limit: request.input.limit,
  });
  const citationPolicy = validateAiExternalCitations(preview);
  if (!citationPolicy.ok) {
    return {
      status: "blocked",
      internalFirstSummary: "External supplier candidate preview was blocked because citations were incomplete.",
      candidates: [],
      citations: [],
      recommendationBoundary: "External candidates cannot create suppliers, orders, requests, or confirmations.",
      requiresApprovalForAction: true,
      finalActionAllowed: false,
      mutationCount: 0,
    };
  }

  return {
    status: preview.status,
    internalFirstSummary:
      "Internal request evidence and marketplace check are required before external supplier candidates.",
    candidates: preview.results.map((result) => ({
      supplierLabel: result.title,
      sourceId: result.sourceId,
      publicProfileSummary: result.summary,
      productMatchSummary: result.summary,
      priceBucket: "unknown",
      availabilityBucket: "unknown",
      riskFlags: ["external_preview_only", "approval_required_for_action"],
      citationRef: result.evidenceRef,
      evidenceRefs: [result.evidenceRef],
    })),
    citations: preview.citations,
    recommendationBoundary:
      "External candidate evidence is preview-only and forbidden for final supplier confirmation or order creation.",
    requiresApprovalForAction: true,
    finalActionAllowed: false,
    mutationCount: 0,
  };
}
