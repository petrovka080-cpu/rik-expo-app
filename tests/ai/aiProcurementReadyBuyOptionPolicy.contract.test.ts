import {
  AI_PROCUREMENT_READY_BUY_OPTION_POLICY,
  hasCitedExternalReadyBuyPreview,
  hasReadyBuyInternalSupplierEvidence,
  normalizeReadyBuyRequestStatus,
  validateProcurementReadyBuyOptionBundlePolicy,
} from "../../src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy";

describe("AI procurement ready buy option policy", () => {
  it("blocks direct side effects and fake procurement signals", () => {
    expect(AI_PROCUREMENT_READY_BUY_OPTION_POLICY).toMatchObject({
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
  });

  it("normalizes approved director requests and requires evidence", () => {
    expect(normalizeReadyBuyRequestStatus({ status: "approved" })).toBe("director_approved");
    expect(normalizeReadyBuyRequestStatus({ approvedByDirector: true })).toBe("director_approved");
    expect(normalizeReadyBuyRequestStatus({ status: "buyer_review" })).toBe("buyer_review");

    expect(
      hasReadyBuyInternalSupplierEvidence({
        supplierName: "Real Supplier",
        matchedItems: ["Cable"],
        evidence: ["internal:supplier:1"],
      }),
    ).toBe(true);
    expect(
      hasReadyBuyInternalSupplierEvidence({
        supplierName: "Real Supplier",
        matchedItems: ["Cable"],
        evidence: [],
      }),
    ).toBe(false);
    expect(
      hasCitedExternalReadyBuyPreview({
        supplierName: "External Supplier",
        matchedItems: ["Cable"],
        citationRefs: ["external:source:1"],
      }),
    ).toBe(true);
    expect(
      hasCitedExternalReadyBuyPreview({
        supplierName: "External Supplier",
        matchedItems: ["Cable"],
        citationRefs: [],
      }),
    ).toBe(false);
  });

  it("rejects bundles with direct mutation flags enabled", () => {
    expect(
      validateProcurementReadyBuyOptionBundlePolicy({
        requestId: "request-1",
        requestStatus: "incoming",
        generatedFrom: "internal_first",
        options: [],
        missingData: [],
        risks: [],
        recommendedNextAction: "request_market_options",
        directOrderAllowed: false,
        directPaymentAllowed: false,
        directWarehouseMutationAllowed: false,
      }),
    ).toBe(true);
  });
});
