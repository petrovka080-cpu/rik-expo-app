import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import { buildProcurementCopilotPlan } from "../../src/features/ai/procurementCopilot/procurementCopilotPlanEngine";
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

describe("procurement copilot plan engine", () => {
  it("builds an evidence-backed runtime plan without final mutation", async () => {
    const steps: string[] = [];
    const toolCalls: string[] = [];
    const result = await buildProcurementCopilotPlan({
      auth: buyerAuth,
      input: {
        requestId: "request-1",
        screenId: "buyer.procurement",
        requestSnapshot,
        recordStep: (step) => steps.push(step),
        searchCatalogItems: async () => {
          toolCalls.push("search_catalog");
          return catalogItems;
        },
        listSuppliers: async () => {
          toolCalls.push("compare_suppliers");
          return suppliers;
        },
      },
    });

    expect(steps).toEqual([
      "internal_request_context",
      "internal_marketplace",
      "compare_suppliers",
      "external_intel_status",
    ]);
    expect(toolCalls).toEqual(["search_catalog", "compare_suppliers"]);
    expect(result.plan).toMatchObject({
      status: "ready",
      internalDataChecked: true,
      marketplaceChecked: true,
      externalIntelStatus: "disabled",
      recommendedNextAction: "draft_request",
      requiresApproval: true,
      supplierCards: [
        expect.objectContaining({
          supplierLabel: "Supplier Alpha",
          source: "marketplace",
        }),
      ],
    });
    expect(result.plan.supplierCards[0].evidenceRefs.length).toBeGreaterThan(0);
    expect(result.proof).toMatchObject({
      toolsCalled: ["search_catalog", "compare_suppliers"],
      mutationCount: 0,
      finalMutationAllowed: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      externalResultCanFinalize: false,
    });
  });
});
