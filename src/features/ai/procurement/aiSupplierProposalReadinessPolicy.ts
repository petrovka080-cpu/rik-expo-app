import type {
  ProcurementApprovedRequestItem,
  ProcurementInternalSupplierEvidence,
  ProcurementReadySupplierProposalBundle,
} from "./aiApprovedRequestSupplierOptions";

export const AI_SUPPLIER_PROPOSAL_READINESS_POLICY = Object.freeze({
  directOrderAllowed: false,
  directPaymentAllowed: false,
  directWarehouseMutationAllowed: false,
  requiresApprovalForOrder: true,
  fakeSuppliersAllowed: false,
  providerCallAllowed: false,
  dbWriteAllowed: false,
});

export function isDirectorApprovedProcurementRequest(input: {
  approvalStatus?: string | null;
  approvedByDirector?: boolean | null;
}): boolean {
  const status = String(input.approvalStatus || "").trim().toLowerCase();
  return status === "approved" || input.approvedByDirector === true;
}

export function hasRealSupplierEvidence(supplier: ProcurementInternalSupplierEvidence): boolean {
  return (
    String(supplier.supplierName || "").trim().length > 0
    && Array.isArray(supplier.evidence)
    && supplier.evidence.some((ref) => String(ref || "").trim().length > 0)
  );
}

export function hasReadyRequestItems(items: readonly ProcurementApprovedRequestItem[]): boolean {
  return items.some((item) => String(item.materialLabel || "").trim().length > 0);
}

export function validateSupplierProposalBundlePolicy(
  bundle: ProcurementReadySupplierProposalBundle | null,
): boolean {
  if (!bundle) return true;
  return (
    bundle.directOrderAllowed === false
    && bundle.requiresApprovalForOrder === true
    && bundle.supplierOptions.every((option) => option.evidence.length > 0)
  );
}
