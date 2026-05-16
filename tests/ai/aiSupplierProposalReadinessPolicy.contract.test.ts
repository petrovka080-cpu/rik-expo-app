import {
  AI_SUPPLIER_PROPOSAL_READINESS_POLICY,
  hasRealSupplierEvidence,
  isDirectorApprovedProcurementRequest,
} from "../../src/features/ai/procurement/aiSupplierProposalReadinessPolicy";

describe("AI supplier proposal readiness policy", () => {
  it("requires approval and blocks direct side effects", () => {
    expect(AI_SUPPLIER_PROPOSAL_READINESS_POLICY).toMatchObject({
      directOrderAllowed: false,
      directPaymentAllowed: false,
      directWarehouseMutationAllowed: false,
      requiresApprovalForOrder: true,
      fakeSuppliersAllowed: false,
      providerCallAllowed: false,
      dbWriteAllowed: false,
    });
  });

  it("recognizes director-approved requests and real supplier evidence", () => {
    expect(isDirectorApprovedProcurementRequest({ approvalStatus: "approved" })).toBe(true);
    expect(isDirectorApprovedProcurementRequest({ approvedByDirector: true })).toBe(true);
    expect(isDirectorApprovedProcurementRequest({ approvalStatus: "pending" })).toBe(false);

    expect(
      hasRealSupplierEvidence({
        supplierName: "Supplier A",
        matchedItems: ["Cement M400"],
        evidence: ["internal:supplier:a"],
      }),
    ).toBe(true);
    expect(
      hasRealSupplierEvidence({
        supplierName: "Supplier A",
        matchedItems: ["Cement M400"],
        evidence: [],
      }),
    ).toBe(false);
  });
});
