import {
  hasCitedExternalReadyBuyPreview,
  hasReadyBuyInternalSupplierEvidence,
  hasReadyBuyRequestItems,
  normalizeReadyBuyRequestStatus,
} from "./aiProcurementReadyBuyOptionPolicy";
import type {
  ProcurementReadyBuyExternalCitedPreview,
  ProcurementReadyBuyInternalSupplierEvidence,
  ProcurementReadyBuyOption,
  ProcurementReadyBuyOptionBundle,
  ProcurementReadyBuyRequestItem,
} from "./aiProcurementReadyBuyOptionTypes";
import { uniqueProcurementRefs } from "./procurementRedaction";

type SearchParamValue = string | string[] | undefined;

export type HydrateProcurementReadyBuyOptionsParams = {
  requestId: string;
  requestStatus?: string | null;
  approvedByDirector?: boolean | null;
  items: readonly ProcurementReadyBuyRequestItem[];
  internalSuppliers?: readonly ProcurementReadyBuyInternalSupplierEvidence[];
  externalCitedPreviews?: readonly ProcurementReadyBuyExternalCitedPreview[];
};

export type ProcurementReadyBuyOptionSearchParams = {
  readyBuyRequestId?: SearchParamValue;
  procurementRequestId?: SearchParamValue;
  requestStatus?: SearchParamValue;
  approvalStatus?: SearchParamValue;
  approvedByDirector?: SearchParamValue;
  readyBuyItems?: SearchParamValue;
  approvedRequestItems?: SearchParamValue;
  readyBuySupplierId?: SearchParamValue;
  readyBuySupplierName?: SearchParamValue;
  readyBuySupplierEvidence?: SearchParamValue;
  readyBuySupplierMatchedItems?: SearchParamValue;
  readyBuySupplierPrice?: SearchParamValue;
  readyBuySupplierDelivery?: SearchParamValue;
  readyBuySupplierReliability?: SearchParamValue;
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

function makeOptionId(source: ProcurementReadyBuyOption["source"], supplierName: string, index: number): string {
  const normalized = supplierName
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${source}:${normalized || "supplier"}:${index + 1}`;
}

function coverageLabel(matchedItems: readonly string[], totalItems: number): string {
  return `${Math.min(matchedItems.length, Math.max(0, totalItems))}/${Math.max(0, totalItems)} позиций`;
}

function mapInternalSupplier(
  supplier: ProcurementReadyBuyInternalSupplierEvidence,
  index: number,
  totalItems: number,
): ProcurementReadyBuyOption {
  const matchedItems = normalizeStringList(supplier.matchedItems);
  const evidence = normalizeStringList(supplier.evidence);
  return {
    id: supplier.supplierId || makeOptionId("internal", supplier.supplierName, index),
    supplierName: supplier.supplierName.trim(),
    source: "internal",
    matchedItems,
    coverageLabel: coverageLabel(matchedItems, totalItems),
    priceSignal: supplier.priceSignal,
    deliverySignal: supplier.deliverySignal,
    reliabilitySignal: supplier.reliabilitySignal,
    risks: normalizeStringList(supplier.risks ?? ["нужно подтвердить актуальность предложения"]),
    missingData: normalizeStringList(supplier.missingData ?? ["подтверждённая цена", "подтверждённый срок"]),
    evidence,
    recommendedAction: matchedItems.length > 1 ? "compare" : "draft_supplier_request",
  };
}

function mapExternalPreview(
  supplier: ProcurementReadyBuyExternalCitedPreview,
  index: number,
  totalItems: number,
): ProcurementReadyBuyOption | null {
  if (!hasCitedExternalReadyBuyPreview(supplier)) return null;
  const matchedItems = normalizeStringList(supplier.matchedItems);
  return {
    id: makeOptionId("external_cited_preview", supplier.supplierName, index),
    supplierName: supplier.supplierName.trim(),
    source: "external_cited_preview",
    matchedItems,
    coverageLabel: coverageLabel(matchedItems, totalItems),
    risks: normalizeStringList(supplier.risks ?? ["внешний источник только для предварительной проверки"]),
    missingData: normalizeStringList(supplier.missingData ?? ["внутренняя карточка поставщика", "подтверждённая котировка"]),
    evidence: normalizeStringList(supplier.citationRefs),
    recommendedAction: "request_quote",
  };
}

function aggregate(values: readonly (readonly string[])[]): string[] {
  return uniqueProcurementRefs(values.flat().map((item) => String(item || "").trim()).filter(Boolean));
}

function hasInsufficientInternalCoverage(options: readonly ProcurementReadyBuyOption[], totalItems: number): boolean {
  if (options.length === 0) return true;
  const covered = new Set(options.flatMap((option) => option.matchedItems.map((item) => item.trim()).filter(Boolean)));
  return totalItems > 0 && covered.size < totalItems;
}

function recommendedBundleAction(options: readonly ProcurementReadyBuyOption[]): ProcurementReadyBuyOptionBundle["recommendedNextAction"] {
  if (options.length === 0) return "request_market_options";
  if (options.length === 1) return "draft_supplier_request";
  return "compare_options";
}

export function hydrateProcurementReadyBuyOptionBundle(
  params: HydrateProcurementReadyBuyOptionsParams,
): ProcurementReadyBuyOptionBundle | null {
  const requestId = String(params.requestId || "").trim();
  if (!requestId || !hasReadyBuyRequestItems(params.items)) return null;

  const items = params.items
    .map((item) => String(item.materialLabel || "").trim())
    .filter(Boolean);
  const totalItems = items.length;
  const internalOptions = (params.internalSuppliers ?? [])
    .filter(hasReadyBuyInternalSupplierEvidence)
    .map((supplier, index) => mapInternalSupplier(supplier, index, totalItems));
  const externalOptions = hasInsufficientInternalCoverage(internalOptions, totalItems)
    ? (params.externalCitedPreviews ?? [])
      .map((supplier, index) => mapExternalPreview(supplier, index, totalItems))
      .filter((option): option is ProcurementReadyBuyOption => option !== null)
    : [];
  const options = [...internalOptions, ...externalOptions];
  const missingData = options.length > 0
    ? aggregate(options.map((option) => option.missingData))
    : ["internal_supplier_evidence", "supplier_quote", "delivery_terms"];
  const risks = options.length > 0
    ? aggregate(options.map((option) => option.risks))
    : ["готовые внутренние варианты не найдены"];

  return {
    requestId,
    requestStatus: normalizeReadyBuyRequestStatus({
      status: params.requestStatus,
      approvedByDirector: params.approvedByDirector,
    }),
    generatedFrom: "internal_first",
    options,
    missingData,
    risks,
    recommendedNextAction: recommendedBundleAction(options),
    directOrderAllowed: false,
    directPaymentAllowed: false,
    directWarehouseMutationAllowed: false,
  };
}

export function buildProcurementReadyBuyBundleFromSearchParams(
  params: ProcurementReadyBuyOptionSearchParams,
): ProcurementReadyBuyOptionBundle | null {
  const requestId =
    firstSearchParam(params.readyBuyRequestId)
    || firstSearchParam(params.procurementRequestId)
    || "";
  const itemLabels = listSearchParam(params.readyBuyItems).length > 0
    ? listSearchParam(params.readyBuyItems)
    : listSearchParam(params.approvedRequestItems);
  const items = itemLabels.map((materialLabel) => ({ materialLabel }));
  const supplierName =
    firstSearchParam(params.readyBuySupplierName)
    || firstSearchParam(params.internalSupplierName);
  const supplierEvidence = listSearchParam(params.readyBuySupplierEvidence).length > 0
    ? listSearchParam(params.readyBuySupplierEvidence)
    : listSearchParam(params.internalSupplierEvidence);
  const internalSuppliers =
    supplierName || supplierEvidence.length > 0
      ? [{
        supplierId: firstSearchParam(params.readyBuySupplierId) || firstSearchParam(params.internalSupplierId),
        supplierName: supplierName || "",
        matchedItems: listSearchParam(params.readyBuySupplierMatchedItems).length > 0
          ? listSearchParam(params.readyBuySupplierMatchedItems)
          : listSearchParam(params.internalSupplierMatchedItems),
        priceSignal: firstSearchParam(params.readyBuySupplierPrice) || firstSearchParam(params.internalSupplierPrice),
        deliverySignal: firstSearchParam(params.readyBuySupplierDelivery) || firstSearchParam(params.internalSupplierDelivery),
        reliabilitySignal: firstSearchParam(params.readyBuySupplierReliability) || firstSearchParam(params.internalSupplierReliability),
        evidence: supplierEvidence,
      }]
      : [];

  return hydrateProcurementReadyBuyOptionBundle({
    requestId,
    requestStatus: firstSearchParam(params.requestStatus) || firstSearchParam(params.approvalStatus),
    approvedByDirector: booleanSearchParam(params.approvedByDirector),
    items,
    internalSuppliers,
  });
}
