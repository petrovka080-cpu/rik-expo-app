import type {
  ProcurementApprovedRequestItem,
  ProcurementExternalCitedPreviewEvidence,
  ProcurementInternalSupplierEvidence,
  ProcurementReadySupplierProposalBundle,
} from "./aiApprovedRequestSupplierOptions";
import {
  hasReadyRequestItems,
  hasRealSupplierEvidence,
  isDirectorApprovedProcurementRequest,
} from "./aiSupplierProposalReadinessPolicy";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type HydrateApprovedRequestSupplierProposalParams = {
  requestId: string;
  approvalStatus?: string | null;
  approvedByDirector?: boolean | null;
  items: readonly ProcurementApprovedRequestItem[];
  internalSuppliers?: readonly ProcurementInternalSupplierEvidence[];
  externalCitedPreviews?: readonly ProcurementExternalCitedPreviewEvidence[];
};

type SearchParamValue = string | string[] | undefined;

export type ApprovedRequestSupplierProposalSearchParams = {
  approvedRequestId?: SearchParamValue;
  procurementRequestId?: SearchParamValue;
  approvalStatus?: SearchParamValue;
  approvedByDirector?: SearchParamValue;
  approvedRequestItems?: SearchParamValue;
  internalSupplierId?: SearchParamValue;
  internalSupplierName?: SearchParamValue;
  internalSupplierEvidence?: SearchParamValue;
  internalSupplierMatchedItems?: SearchParamValue;
  internalSupplierPrice?: SearchParamValue;
  internalSupplierDelivery?: SearchParamValue;
  internalSupplierReliability?: SearchParamValue;
};

function normalizeStringList(values: readonly string[] | undefined): string[] {
  return uniqueProcurementRefs([...(values ?? [])]).filter(Boolean);
}

function firstSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function booleanSearchParam(value: SearchParamValue): boolean {
  const normalized = String(firstSearchParam(value) || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function listSearchParam(value: SearchParamValue): string[] {
  const raw = Array.isArray(value) ? value.join("|") : String(value || "");
  return raw
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapInternalSupplier(
  supplier: ProcurementInternalSupplierEvidence,
): ProcurementReadySupplierProposalBundle["supplierOptions"][number] {
  return {
    supplierId: supplier.supplierId,
    supplierName: supplier.supplierName.trim(),
    source: "internal",
    matchedItems: normalizeStringList(supplier.matchedItems),
    priceSignal: supplier.priceSignal,
    deliverySignal: supplier.deliverySignal,
    reliabilitySignal: supplier.reliabilitySignal,
    risks: normalizeStringList(supplier.risks ?? ["needs_quote_confirmation"]),
    evidence: normalizeStringList(supplier.evidence),
    missingData: normalizeStringList(supplier.missingData ?? ["confirmed_price", "confirmed_delivery"]),
    recommendedNextAction: "compare",
  };
}

function mapExternalPreview(
  supplier: ProcurementExternalCitedPreviewEvidence,
): ProcurementReadySupplierProposalBundle["supplierOptions"][number] | null {
  const evidence = normalizeStringList(supplier.citationRefs);
  if (!supplier.supplierName.trim() || evidence.length === 0) return null;
  return {
    supplierName: supplier.supplierName.trim(),
    source: "external_cited_preview",
    matchedItems: normalizeStringList(supplier.matchedItems),
    risks: normalizeStringList(supplier.risks ?? ["external_preview_only", "approval_required_for_action"]),
    evidence,
    missingData: normalizeStringList(supplier.missingData ?? ["internal_supplier_record", "confirmed_quote"]),
    recommendedNextAction: "request_quote",
  };
}

export function hydrateApprovedRequestSupplierProposalBundle(
  params: HydrateApprovedRequestSupplierProposalParams,
): ProcurementReadySupplierProposalBundle | null {
  if (
    !params.requestId.trim()
    || !isDirectorApprovedProcurementRequest(params)
    || !hasReadyRequestItems(params.items)
  ) {
    return null;
  }

  const internalOptions = (params.internalSuppliers ?? [])
    .filter(hasRealSupplierEvidence)
    .map(mapInternalSupplier);
  const externalOptions =
    internalOptions.length > 0
      ? (params.externalCitedPreviews ?? []).map(mapExternalPreview).filter((item): item is NonNullable<typeof item> => item !== null)
      : [];
  const supplierOptions = [...internalOptions, ...externalOptions];

  return {
    requestId: params.requestId,
    approvalStatus: "approved",
    generatedFrom: "internal_first",
    supplierOptions,
    recommendedOptionId: supplierOptions[0]?.supplierId ?? supplierOptions[0]?.supplierName,
    directOrderAllowed: false,
    requiresApprovalForOrder: true,
  };
}

export function buildApprovedRequestBundleFromSearchParams(
  params: ApprovedRequestSupplierProposalSearchParams,
): ProcurementReadySupplierProposalBundle | null {
  const requestId = firstSearchParam(params.approvedRequestId) || firstSearchParam(params.procurementRequestId) || "";
  const items = listSearchParam(params.approvedRequestItems).map((materialLabel) => ({ materialLabel }));
  const supplierName = firstSearchParam(params.internalSupplierName);
  const supplierEvidence = listSearchParam(params.internalSupplierEvidence);
  const internalSuppliers =
    supplierName || supplierEvidence.length > 0
      ? [{
        supplierId: firstSearchParam(params.internalSupplierId),
        supplierName: supplierName || "",
        matchedItems: listSearchParam(params.internalSupplierMatchedItems),
        priceSignal: firstSearchParam(params.internalSupplierPrice),
        deliverySignal: firstSearchParam(params.internalSupplierDelivery),
        reliabilitySignal: firstSearchParam(params.internalSupplierReliability),
        evidence: supplierEvidence,
      }]
      : [];

  return hydrateApprovedRequestSupplierProposalBundle({
    requestId,
    approvalStatus: firstSearchParam(params.approvalStatus),
    approvedByDirector: booleanSearchParam(params.approvedByDirector),
    items,
    internalSuppliers,
  });
}
