import {
  AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT,
  understandAiProcurementRequest,
} from "../../src/features/ai/procurement/aiProcurementRequestUnderstanding";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI procurement request understanding", () => {
  it("normalizes request materials as internal-first evidence without external fetch or mutation", () => {
    const result = understandAiProcurementRequest({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot: {
        requestId: "request-1",
        projectId: "project-1",
        projectTitle: "Tower A",
        location: "Bishkek",
        items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
      },
    });

    expect(AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT).toMatchObject({
      internalFirst: true,
      externalFetch: false,
      supplierConfirmed: false,
      orderCreated: false,
      warehouseMutated: false,
      paymentCreated: false,
      mutationCount: 0,
    });
    expect(result).toMatchObject({
      status: "loaded",
      screenId: "buyer.requests",
      sourceOrder: ["internal_app", "marketplace", "external_policy"],
      internalFirst: true,
      internalDataChecked: true,
      marketplaceChecked: false,
      externalFetch: false,
      supplierConfirmed: false,
      orderCreated: false,
      warehouseMutated: false,
      paymentCreated: false,
      mutationCount: 0,
      approvalRequired: true,
      recommendedNextStep: "internal_supplier_rank",
    });
    expect(result.materials).toEqual([
      expect.objectContaining({
        materialLabel: "Cement M400",
        internalCatalogCheckRequired: true,
        internalSupplierRankRequired: true,
      }),
    ]);
    expect(result.evidenceRefs).toEqual(expect.arrayContaining([expect.stringContaining("internal_app:")]));
  });

  it("blocks roles outside procurement scope without inventing request data", () => {
    const result = understandAiProcurementRequest({
      auth: { userId: "contractor-user", role: "contractor" },
      requestId: "request-1",
      screenId: "contractor.main",
      requestSnapshot: null,
    });

    expect(result).toMatchObject({
      status: "blocked",
      recommendedNextStep: "blocked",
      materials: [],
      externalFetch: false,
      mutationCount: 0,
    });
    expect(result.missingFields).toContain("role_scope_denied");
  });
});
