import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import {
  AI_PROCUREMENT_DECISION_ENGINE_CONTRACT,
  runAiProcurementDecisionEngine,
} from "../../src/features/ai/procurement/aiProcurementDecisionEngine";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const requestSnapshot = {
  requestId: "request-1",
  projectId: "project-1",
  projectTitle: "Tower A",
  location: "Bishkek",
  items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
};

const catalogItems: CatalogItem[] = [
  { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
];

const suppliers: Supplier[] = [
  {
    id: "supplier-2",
    name: "Beta Materials",
    specialization: "cement",
    address: "Bishkek",
    website: "https://beta.example",
  },
  {
    id: "supplier-1",
    name: "Alpha Supply",
    specialization: "cement",
    address: "Bishkek",
    website: "https://alpha.example",
  },
];

describe("AI procurement internal-first decision engine", () => {
  it("orchestrates internal request evidence, supplier rank, risk, and approval-only output", async () => {
    let supplierQuery = "";
    const result = await runAiProcurementDecisionEngine({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot,
      searchCatalogItems: async () => catalogItems,
      listSuppliers: async (query) => {
        supplierQuery = query;
        return suppliers;
      },
    });

    expect(AI_PROCUREMENT_DECISION_ENGINE_CONTRACT).toMatchObject({
      internalFirst: true,
      externalFetch: false,
      supplierConfirmed: false,
      orderCreated: false,
      warehouseMutated: false,
      paymentCreated: false,
      mutationCount: 0,
      finalExecution: 0,
    });
    expect(result).toMatchObject({
      finalStatus: "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY",
      exactReason: null,
      recommendedInternalOptionReady: true,
      evidenceCardsReady: true,
      riskSignalsReady: true,
      approvalActionCandidateReady: true,
      internalFirst: true,
      internalDataChecked: true,
      marketplaceChecked: true,
      externalFetch: false,
      external_fetch: false,
      supplierConfirmed: false,
      supplier_confirmed: false,
      orderCreated: false,
      order_created: false,
      warehouseMutated: false,
      warehouse_mutated: false,
      paymentCreated: false,
      payment_created: false,
      fakeSuppliersCreated: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      rawProviderPayloadReturned: false,
      approvalRequired: true,
      mutationCount: 0,
      finalExecution: 0,
    });
    expect(result.supplierRank.rankedSuppliers.map((supplier) => supplier.supplierLabel)).toEqual([
      "Alpha Supply",
      "Beta Materials",
    ]);
    expect(supplierQuery).toContain("Cement M400");
    expect(result.evidenceCards.cards.map((card) => card.kind)).toEqual([
      "recommended_internal_option",
      "evidence",
      "risk",
      "missing_data",
      "approval_action_candidate",
    ]);
    expect(result.approvalCandidate).toMatchObject({
      status: "ready",
      actionId: "buyer.requests.approval",
      directExecuteAllowed: false,
      executeOnlyAfterApprovedStatus: true,
    });
  });

  it("keeps an honest empty supplier state green without inventing suppliers", async () => {
    const result = await runAiProcurementDecisionEngine({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot,
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.finalStatus).toBe("GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY");
    expect(result.recommendedInternalOptionReady).toBe(false);
    expect(result.supplierRank.rankedSuppliers).toEqual([]);
    expect(result.supplierRank.missingData).toContain("supplier_candidates");
    expect(result.evidenceCards.cards).toHaveLength(5);
    expect(result.fakeSuppliersCreated).toBe(false);
    expect(result.orderCreated).toBe(false);
    expect(result.mutationCount).toBe(0);
  });

  it("blocks when internal request evidence itself is missing", async () => {
    const result = await runAiProcurementDecisionEngine({
      auth: { userId: "contractor-user", role: "contractor" },
      requestId: "request-1",
      screenId: "contractor.main",
      requestSnapshot: null,
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.finalStatus).toBe("BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING");
    expect(result.fakeSuppliersCreated).toBe(false);
    expect(result.mutationCount).toBe(0);
  });
});
