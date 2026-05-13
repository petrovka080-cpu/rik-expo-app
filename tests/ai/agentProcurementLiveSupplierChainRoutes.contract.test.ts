import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  draftAgentProcurementLiveSupplierChain,
  previewAgentProcurementLiveSupplierChain,
  submitAgentProcurementLiveSupplierChainForApproval,
} from "../../src/features/ai/agent/agentBffRouteShell";
import type { ProcurementSafeRequestSnapshot } from "../../src/features/ai/procurement/procurementContextTypes";

const auth = { userId: "buyer-user", role: "buyer" } as const;
const requestSnapshot: ProcurementSafeRequestSnapshot = {
  requestId: "request-1",
  projectId: "project-1",
  projectTitle: "Tower A",
  location: "Bishkek",
  items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
};

const routeRequest = {
  auth,
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
} as const;

describe("agent procurement live supplier chain routes", () => {
  it("registers preview, draft, and submit-for-approval route contracts as non-mutating", () => {
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "agent.procurement.live_supplier_chain.preview",
          endpoint: "POST /agent/procurement/live-supplier-chain/preview",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.procurement.live_supplier_chain.draft",
          endpoint: "POST /agent/procurement/live-supplier-chain/draft",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.procurement.live_supplier_chain.submit_for_approval",
          endpoint: "POST /agent/procurement/live-supplier-chain/submit-for-approval",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
      ]),
    );
  });

  it("returns the same safe live-chain result through preview, draft, and approval boundary routes", async () => {
    const preview = await previewAgentProcurementLiveSupplierChain(routeRequest);
    const draft = await draftAgentProcurementLiveSupplierChain(routeRequest);
    const approval = await submitAgentProcurementLiveSupplierChainForApproval(routeRequest);

    for (const response of [preview, draft, approval]) {
      expect(response.ok).toBe(true);
      if (!response.ok) throw new Error("expected procurement live chain response");
      expect(response.data).toMatchObject({
        contractId: "agent_procurement_bff_v1",
        runtimeBoundary: "internal_context_marketplace_compare_draft_approval",
        roleScoped: true,
        readOnly: true,
        evidenceBacked: true,
        approvalRequired: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      });
      expect(response.data.result).toMatchObject({
        status: "ready",
        internalFirst: true,
        marketplaceSecond: true,
        draftRequestCreated: true,
        submitForApprovalBoundaryReached: true,
        mutationCount: 0,
        supplierConfirmed: false,
        orderCreated: false,
        warehouseMutated: false,
        paymentCreated: false,
      });
    }

    expect(preview.ok && preview.data.endpoint).toBe(
      "POST /agent/procurement/live-supplier-chain/preview",
    );
    expect(draft.ok && draft.data.endpoint).toBe(
      "POST /agent/procurement/live-supplier-chain/draft",
    );
    expect(approval.ok && approval.data.endpoint).toBe(
      "POST /agent/procurement/live-supplier-chain/submit-for-approval",
    );
  });
});
