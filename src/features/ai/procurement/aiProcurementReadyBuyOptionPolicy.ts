import type {
  ProcurementReadyBuyExternalCitedPreview,
  ProcurementReadyBuyInternalSupplierEvidence,
  ProcurementReadyBuyOptionBundle,
  ProcurementReadyBuyRequestItem,
  ProcurementReadyBuyRequestStatus,
} from "./aiProcurementReadyBuyOptionTypes";

export const AI_PROCUREMENT_READY_BUY_OPTION_POLICY = Object.freeze({
  generatedFrom: "internal_first",
  externalPreviewCitedOnly: true,
  fakeSuppliersAllowed: false,
  fakePricesAllowed: false,
  fakeAvailabilityAllowed: false,
  directOrderAllowed: false,
  directPaymentAllowed: false,
  directWarehouseMutationAllowed: false,
  providerCallAllowed: false,
  dbWriteAllowed: false,
});

export function normalizeReadyBuyRequestStatus(input: {
  status?: string | null;
  approvedByDirector?: boolean | null;
}): ProcurementReadyBuyRequestStatus {
  const status = String(input.status || "").trim().toLowerCase();
  if (input.approvedByDirector === true || status === "approved" || status === "director_approved") {
    return "director_approved";
  }
  if (status === "buyer_review" || status === "in_review") return "buyer_review";
  if (status === "needs_more_data" || status === "missing_data") return "needs_more_data";
  return "incoming";
}

export function hasReadyBuyRequestItems(items: readonly ProcurementReadyBuyRequestItem[]): boolean {
  return items.some((item) => String(item.materialLabel || "").trim().length > 0);
}

export function hasReadyBuyInternalSupplierEvidence(
  supplier: ProcurementReadyBuyInternalSupplierEvidence,
): boolean {
  return (
    String(supplier.supplierName || "").trim().length > 0
    && Array.isArray(supplier.evidence)
    && supplier.evidence.some((ref) => String(ref || "").trim().length > 0)
  );
}

export function hasCitedExternalReadyBuyPreview(
  preview: ProcurementReadyBuyExternalCitedPreview,
): boolean {
  return (
    String(preview.supplierName || "").trim().length > 0
    && Array.isArray(preview.citationRefs)
    && preview.citationRefs.some((ref) => String(ref || "").trim().length > 0)
  );
}

export function validateProcurementReadyBuyOptionBundlePolicy(
  bundle: ProcurementReadyBuyOptionBundle | null,
): boolean {
  if (!bundle) return true;
  return (
    bundle.generatedFrom === "internal_first"
    && bundle.directOrderAllowed === false
    && bundle.directPaymentAllowed === false
    && bundle.directWarehouseMutationAllowed === false
    && bundle.options.every((option) => (
      option.supplierName.trim().length > 0
      && option.evidence.length > 0
      && (
        option.source === "internal"
        || option.evidence.every((ref) => ref.trim().length > 0)
      )
    ))
  );
}
