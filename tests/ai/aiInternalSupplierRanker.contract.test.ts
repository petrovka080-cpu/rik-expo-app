import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import { rankAiInternalSuppliers } from "../../src/features/ai/procurement/aiInternalSupplierRanker";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

function loadedContext() {
  return resolveProcurementRequestContext({
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
}

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

describe("AI internal supplier ranker", () => {
  it("ranks only internal supplier evidence and keeps all final actions disabled", async () => {
    const result = await rankAiInternalSuppliers({
      auth: buyerAuth,
      context: loadedContext(),
      searchCatalogItems: async () => catalogItems,
      listSuppliers: async () => suppliers,
    });

    expect(result).toMatchObject({
      status: "loaded",
      internalFirst: true,
      internal_first: true,
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
      requiresApproval: true,
      mutationCount: 0,
    });
    expect(result.rankedSuppliers.map((supplier) => supplier.supplierLabel)).toEqual([
      "Alpha Supply",
      "Beta Materials",
    ]);
    expect(result.rankedSuppliers.every((supplier) => supplier.evidenceRefs.length > 0)).toBe(true);
    expect(result.evidenceRefs).toEqual(expect.arrayContaining([expect.stringContaining("internal_app:")]));
  });

  it("returns an empty rank without fake suppliers when internal supplier data is unavailable", async () => {
    const result = await rankAiInternalSuppliers({
      auth: buyerAuth,
      context: loadedContext(),
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.status).toBe("empty");
    expect(result.rankedSuppliers).toEqual([]);
    expect(result.supplierCards).toEqual([]);
    expect(result.missingData).toContain("supplier_candidates");
    expect(result.mutationCount).toBe(0);
  });
});
