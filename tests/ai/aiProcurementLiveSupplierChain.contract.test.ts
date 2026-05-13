import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import {
  AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT,
  runAiProcurementLiveSupplierChain,
} from "../../src/features/ai/procurement/aiProcurementLiveChain";
import type { ProcurementSafeRequestSnapshot } from "../../src/features/ai/procurement/procurementContextTypes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const requestSnapshot: ProcurementSafeRequestSnapshot = {
  requestId: "request-1",
  projectId: "project-1",
  projectTitle: "Tower A",
  location: "Bishkek",
  items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag", category: "cement" }],
};

const catalogItems: CatalogItem[] = [
  { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
];

const suppliers: Supplier[] = [
  {
    id: "supplier-1",
    name: "Supplier Alpha",
    specialization: "cement",
    address: "Bishkek",
    website: "https://supplier.example",
  },
];

describe("AI procurement live supplier chain", () => {
  it("runs internal context to supplier compare to draft and approval boundary without mutation", async () => {
    const result = await runAiProcurementLiveSupplierChain({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot,
      searchCatalogItems: async () => catalogItems,
      listSuppliers: async () => suppliers,
    });

    expect(AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT).toMatchObject({
      internalFirstRequired: true,
      marketplaceSecondRequired: true,
      draftRequestRequired: true,
      submitForApprovalBoundaryRequired: true,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      mutationCount: 0,
      fakeSuppliersAllowed: false,
    });
    expect(result.status).toBe("ready");
    expect(result.sourceOrder).toEqual([
      "internal_request_context",
      "internal_marketplace",
      "compare_suppliers",
      "external_intel_status",
      "draft_request_preview",
      "approval_boundary",
    ]);
    expect(result.sourceOrderVerified).toBe(true);
    expect(result.internalFirst).toBe(true);
    expect(result.marketplaceSecond).toBe(true);
    expect(result.requestContextLoaded).toBe(true);
    expect(result.supplierComparePerformed).toBe(true);
    expect(result.supplierCardsCount).toBe(1);
    expect(result.supplierCardsHaveEvidence).toBe(true);
    expect(result.draftRequestCreated).toBe(true);
    expect(result.submitForApprovalBoundaryReached).toBe(true);
    expect(result.approvalRequired).toBe(true);
    expect(result.auditRequired).toBe(true);
    expect(result.idempotencyRequired).toBe(true);
    expect(result.evidence?.allEvidenceRefs.length).toBeGreaterThan(0);
    expect(result.mutationCount).toBe(0);
    expect(result.unsafeDomainMutationsCreated).toBe(0);
    expect(result.supplierConfirmed).toBe(false);
    expect(result.orderCreated).toBe(false);
    expect(result.warehouseMutated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.externalLiveFetch).toBe(false);
    expect(result.fakeSuppliersCreated).toBe(false);
    expect(result.rawRowsReturned).toBe(false);
    expect(result.rawPromptReturned).toBe(false);
    expect(result.rawProviderPayloadReturned).toBe(false);
  });

  it("blocks without creating fake request data when no real request snapshot is available", async () => {
    const result = await runAiProcurementLiveSupplierChain({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot: null,
    });

    expect(result).toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE",
      fakeSuppliersCreated: false,
      fakeMarketplaceDataCreated: false,
      fakeExternalResultsCreated: false,
      mutationCount: 0,
    });
  });
});
