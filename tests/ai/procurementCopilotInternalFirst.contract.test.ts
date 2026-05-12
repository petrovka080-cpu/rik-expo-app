import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import { buildProcurementCopilotPlan } from "../../src/features/ai/procurementCopilot/procurementCopilotPlanEngine";
import { PROCUREMENT_COPILOT_SOURCE_ORDER } from "../../src/features/ai/procurementCopilot/procurementCopilotTypes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement copilot internal-first policy", () => {
  it("keeps internal context before marketplace and marketplace before external status", async () => {
    const steps: string[] = [];
    const calls: string[] = [];
    const catalogItems: CatalogItem[] = [
      { code: "CAT-1", name: "Rebar A500", uom: "tn", kind: "material" },
    ];
    const suppliers: Supplier[] = [
      {
        id: "supplier-1",
        name: "Rebar Supplier",
        specialization: "rebar",
        address: "Bishkek",
        website: "https://supplier.example",
      },
    ];

    await buildProcurementCopilotPlan({
      auth: buyerAuth,
      input: {
        requestId: "request-2",
        screenId: "buyer.procurement",
        requestSnapshot: {
          requestId: "request-2",
          projectId: "project-2",
          items: [{ materialLabel: "Rebar A500", quantity: 3, unit: "tn" }],
        },
        recordStep: (step) => steps.push(step),
        searchCatalogItems: async () => {
          calls.push("search_catalog");
          return catalogItems;
        },
        listSuppliers: async () => {
          calls.push("compare_suppliers");
          return suppliers;
        },
      },
    });

    expect(PROCUREMENT_COPILOT_SOURCE_ORDER).toEqual([
      "internal_request_context",
      "internal_marketplace",
      "compare_suppliers",
      "external_intel_status",
      "draft_request_preview",
      "approval_boundary",
    ]);
    expect(steps.indexOf("internal_request_context")).toBeLessThan(steps.indexOf("internal_marketplace"));
    expect(steps.indexOf("internal_marketplace")).toBeLessThan(steps.indexOf("external_intel_status"));
    expect(calls).toEqual(["search_catalog", "compare_suppliers"]);
  });
});
