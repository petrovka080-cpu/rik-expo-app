import {
  runCompareSuppliersToolSafeRead,
  type CompareSupplierCard,
} from "../tools/compareSuppliersTool";
import { runSearchCatalogToolSafeRead } from "../tools/searchCatalogTool";
import { createExternalIntelGateway, type ExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "../externalIntel/externalSourceRegistry";
import { buildProcurementInternalFirstPlan } from "./procurementInternalFirstEngine";
import type {
  ExternalSupplierCandidatesInput,
  ExternalSupplierCandidatesOutput,
  ProcurementAuthContext,
  ProcurementCatalogReader,
  ProcurementNoMutationProof,
  ProcurementRequestContext,
  ProcurementSafeToolName,
  ProcurementSupplierReader,
  SupplierMatchPreviewInput,
  SupplierMatchPreviewResult,
} from "./procurementContextTypes";
import { canUseProcurementRequestContext } from "./procurementRequestContextResolver";
import {
  clampProcurementLimit,
  hashOpaqueId,
  normalizeProcurementLabel,
  normalizeProcurementOptionalText,
  normalizeProcurementPositiveNumber,
  normalizeProcurementText,
  uniqueProcurementRefs,
} from "./procurementRedaction";

export const PROCUREMENT_SUPPLIER_MATCH_MAX_LIMIT = 10;
const PROCUREMENT_SUPPLIER_MATCH_DEFAULT_LIMIT = 5;

export type ProcurementSupplierMatchEngineRequest = {
  auth: ProcurementAuthContext | null;
  context?: ProcurementRequestContext | null;
  input: SupplierMatchPreviewInput;
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
  searchCatalogItems?: ProcurementCatalogReader;
  listSuppliers?: ProcurementSupplierReader;
  externalGateway?: ExternalIntelGateway;
};

function proof(toolsCalled: readonly ProcurementSafeToolName[]): ProcurementNoMutationProof {
  return {
    toolsCalled,
    mutationCount: 0,
    finalMutationAllowed: false,
    supplierSelectionAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    externalResultCanFinalize: false,
  };
}

function blockedResult(params: {
  reason: string;
  toolsCalled?: readonly ProcurementSafeToolName[];
  internalEvidenceRefs?: readonly string[];
}): SupplierMatchPreviewResult {
  return {
    output: {
      status: "blocked",
      internalDataChecked: true,
      marketplaceChecked: true,
      externalChecked: false,
      externalStatus: "not_requested",
      supplierCards: [],
      recommendationSummary: "Supplier match preview is blocked by policy.",
      missingData: [params.reason],
      nextAction: "blocked",
      requiresApproval: true,
      evidenceRefs: uniqueProcurementRefs([...(params.internalEvidenceRefs ?? [])]),
    },
    proof: proof(params.toolsCalled ?? []),
  };
}

function normalizeItems(input: SupplierMatchPreviewInput): SupplierMatchPreviewInput["items"] {
  return input.items
    .map((item, index) => ({
      materialLabel: normalizeProcurementLabel(item.materialLabel, `item_${index + 1}`),
      category: normalizeProcurementOptionalText(item.category),
      quantity: normalizeProcurementPositiveNumber(item.quantity),
      unit: normalizeProcurementOptionalText(item.unit),
    }))
    .filter((item) => item.materialLabel.trim().length > 0)
    .slice(0, 20);
}

function toCatalogMaterialIds(params: {
  catalogItemIds: readonly string[];
  items: SupplierMatchPreviewInput["items"];
}): string[] {
  const fallbackItemRefs = params.items.map((item, index) =>
    item.materialLabel ? hashOpaqueId("material_label", `${index}:${item.materialLabel}`) : "",
  );
  return uniqueProcurementRefs([...params.catalogItemIds, ...fallbackItemRefs]).slice(0, 20);
}

function mapSupplierCard(card: CompareSupplierCard): SupplierMatchPreviewResult["output"]["supplierCards"][number] {
  return {
    supplierLabel: normalizeProcurementLabel(card.supplier_name, "supplier_candidate"),
    priceBucket: "unknown",
    deliveryBucket: "unknown",
    availabilityBucket: "unknown",
    riskFlags: uniqueProcurementRefs(card.risk_flags),
    evidenceRefs: uniqueProcurementRefs([card.evidence_ref]),
  };
}

function internalEvidenceFromRequest(params: {
  context?: ProcurementRequestContext | null;
  requestIdHash?: string;
  items: SupplierMatchPreviewInput["items"];
}): string[] {
  const contextRefs = params.context?.internalEvidenceRefs.map((ref) => ref.id) ?? [];
  const requestRef = params.requestIdHash ? [`internal_app:request:${params.requestIdHash}`] : [];
  const itemRefs = params.items.map((item, index) =>
    `internal_app:item:${hashOpaqueId("request_item", `${index}:${item.materialLabel}`)}`,
  );
  return uniqueProcurementRefs([...contextRefs, ...requestRef, ...itemRefs]);
}

function buildExternalSupplierQuery(input: ExternalSupplierCandidatesInput): string {
  const itemLabels = normalizeItems({ items: input.items }).map((item) => item.materialLabel);
  const location = normalizeProcurementOptionalText(input.location);
  return uniqueProcurementRefs([...itemLabels, location ? [`location:${location}`] : []].flat()).join(" ");
}

export async function previewProcurementExternalSupplierCandidates(params: {
  auth: ProcurementAuthContext | null;
  input: ExternalSupplierCandidatesInput;
  sourcePolicyIds?: readonly string[];
  externalGateway?: ExternalIntelGateway;
}): Promise<ExternalSupplierCandidatesOutput> {
  if (!params.auth || !canUseProcurementRequestContext(params.auth.role)) {
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

  const gateway = params.externalGateway ?? createExternalIntelGateway();
  const preview = await gateway.searchPreview({
    domain: "procurement",
    query: buildExternalSupplierQuery(params.input),
    location: params.input.location,
    internalEvidenceRefs: params.input.internalEvidenceRefs,
    marketplaceChecked: params.input.marketplaceChecked,
    sourcePolicyIds: [...(params.sourcePolicyIds ?? PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS)],
    limit: params.input.limit,
  });

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

export async function previewProcurementSupplierMatch(
  request: ProcurementSupplierMatchEngineRequest,
): Promise<SupplierMatchPreviewResult> {
  if (!request.auth || !canUseProcurementRequestContext(request.auth.role)) {
    return blockedResult({ reason: "role_scope_denied" });
  }

  const toolsCalled: ProcurementSafeToolName[] = [];
  const limit = clampProcurementLimit(
    request.input.limit,
    PROCUREMENT_SUPPLIER_MATCH_DEFAULT_LIMIT,
    PROCUREMENT_SUPPLIER_MATCH_MAX_LIMIT,
  );
  const items = normalizeItems(request.input);
  const internalEvidenceRefs = internalEvidenceFromRequest({
    context: request.context,
    requestIdHash: normalizeProcurementOptionalText(request.input.requestIdHash),
    items,
  });
  if (items.length === 0) {
    return {
      output: {
        status: "empty",
        internalDataChecked: true,
        marketplaceChecked: true,
        externalChecked: false,
        externalStatus: "not_requested",
        supplierCards: [],
        recommendationSummary: "No requested items were available for supplier matching.",
        missingData: ["items"],
        nextAction: "explain",
        requiresApproval: true,
        evidenceRefs: internalEvidenceRefs,
      },
      proof: proof(toolsCalled),
    };
  }

  const marketplaceEvidenceRefs: string[] = [];
  const catalogItemIds: string[] = [];
  for (const item of items) {
    toolsCalled.push("search_catalog");
    const catalogResult = await runSearchCatalogToolSafeRead({
      auth: request.auth,
      input: {
        query: item.materialLabel,
        category: "material",
        location: request.input.location,
        limit,
      },
      searchCatalogItems: request.searchCatalogItems,
    });
    if (!catalogResult.ok) {
      return blockedResult({
        reason: "marketplace_catalog_search_failed",
        toolsCalled,
        internalEvidenceRefs,
      });
    }
    marketplaceEvidenceRefs.push(...catalogResult.data.evidence_refs);
    catalogItemIds.push(...catalogResult.data.items.map((catalogItem) => catalogItem.catalog_item_id));
  }

  const materialIds = toCatalogMaterialIds({ catalogItemIds, items });
  toolsCalled.push("compare_suppliers");
  const supplierResult = await runCompareSuppliersToolSafeRead({
    auth: request.auth,
    input: {
      material_ids: materialIds,
      location: normalizeProcurementText(request.input.location),
      limit,
    },
    listSuppliers: request.listSuppliers,
  });
  if (!supplierResult.ok) {
    return blockedResult({
      reason: "marketplace_supplier_compare_failed",
      toolsCalled,
      internalEvidenceRefs,
    });
  }

  marketplaceEvidenceRefs.push(...supplierResult.data.evidence_refs);
  const internalFirstPlan = buildProcurementInternalFirstPlan({
    context: request.context ?? {
      status: "loaded",
      requestIdHash: request.input.requestIdHash ?? "request_missing",
      role: request.auth.role,
      screenId: "agent.procurement",
      projectSummary: {},
      requestedItems: items,
      internalEvidenceRefs: [],
      missingFields: [],
      allowedNextActions: ["search_catalog", "compare_suppliers", "draft_request", "submit_for_approval"],
      approvalRequired: true,
    },
    marketplaceEvidenceRefs,
    externalRequested: request.externalRequested,
    externalSourcePolicyIds: request.externalSourcePolicyIds,
  });
  const supplierCards = supplierResult.data.supplier_cards.map(mapSupplierCard);
  const externalPreview = request.externalRequested
    ? await previewProcurementExternalSupplierCandidates({
        auth: request.auth,
        input: {
          requestIdHash: request.input.requestIdHash,
          items,
          location: request.input.location,
          internalEvidenceRefs,
          marketplaceChecked: true,
          limit,
        },
        sourcePolicyIds: request.externalSourcePolicyIds,
        externalGateway: request.externalGateway,
      })
    : null;
  const evidenceRefs = uniqueProcurementRefs([
    ...internalEvidenceRefs,
    ...marketplaceEvidenceRefs,
    ...internalFirstPlan.evidenceRefs,
    ...(externalPreview?.candidates.flatMap((candidate) => candidate.evidenceRefs) ?? []),
  ]);
  const status = supplierCards.length > 0 ? "loaded" : "empty";
  const missingData = uniqueProcurementRefs([
    ...internalFirstPlan.missingData,
    ...(supplierCards.length > 0 ? [] : ["supplier_candidates"]),
  ]);

  return {
    output: {
      status,
      internalDataChecked: true,
      marketplaceChecked: true,
      externalChecked: externalPreview?.status === "loaded" || externalPreview?.status === "empty",
      externalStatus: externalPreview?.status ?? internalFirstPlan.externalStatus,
      supplierCards,
      recommendationSummary: supplierResult.data.recommendation_summary,
      missingData,
      nextAction: status === "loaded" ? "draft_request" : "explain",
      requiresApproval: true,
      evidenceRefs,
      externalCitations: externalPreview?.citations,
    },
    proof: proof(toolsCalled),
  };
}
