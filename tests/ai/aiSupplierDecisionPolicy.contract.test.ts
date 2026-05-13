import { runProcurementCopilotRuntimeChain } from "../../src/features/ai/procurementCopilot/procurementCopilotPlanEngine";
import {
  AI_PROCUREMENT_SUPPLIER_DECISION_POLICY,
  validateAiProcurementSupplierDecision,
} from "../../src/features/ai/procurement/aiSupplierDecisionPolicy";
import type { ProcurementSafeRequestSnapshot } from "../../src/features/ai/procurement/procurementContextTypes";

const requestSnapshot: ProcurementSafeRequestSnapshot = {
  requestId: "request-1",
  projectId: "project-1",
  projectTitle: "Tower A",
  location: "Bishkek",
  items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
};

describe("AI procurement supplier decision policy", () => {
  it("requires internal-first evidence, draft preview, and approval boundary before action", async () => {
    const resolved = await runProcurementCopilotRuntimeChain({
      auth: { userId: "buyer-user", role: "buyer" },
      input: {
        requestId: "request-1",
        screenId: "buyer.requests",
        requestSnapshot,
        searchCatalogItems: async () => [
          { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
        ],
        listSuppliers: async () => [
          {
            id: "supplier-1",
            name: "Supplier Alpha",
            specialization: "cement",
            address: "Bishkek",
            website: "https://supplier.example",
          },
        ],
      },
    });
    const validation = validateAiProcurementSupplierDecision(resolved);

    expect(AI_PROCUREMENT_SUPPLIER_DECISION_POLICY).toMatchObject({
      internalFirstRequired: true,
      marketplaceSecondRequired: true,
      evidenceRequired: true,
      draftOnlyBeforeApproval: true,
      submitForApprovalBoundaryRequired: true,
      highRiskRequiresApproval: true,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      externalLiveFetch: false,
      mutationCount: 0,
      finalExecution: 0,
      fakeSuppliersAllowed: false,
    });
    expect(validation).toMatchObject({
      ok: true,
      blockers: [],
      internalFirst: true,
      marketplaceSecond: true,
      supplierCardsHaveEvidence: true,
      draftRequestReady: true,
      submitForApprovalBoundaryReached: true,
      highRiskRequiresApproval: true,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      externalLiveFetch: false,
      mutationCount: 0,
      finalExecution: 0,
    });
  });
});
