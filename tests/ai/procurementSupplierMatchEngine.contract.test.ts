import type { CatalogItem, Supplier } from "../../src/lib/catalog/catalog.types";
import { previewProcurementSupplierMatch } from "../../src/features/ai/procurement/procurementSupplierMatchEngine";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const catalogItems: CatalogItem[] = [
  { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
];
const suppliers: Supplier[] = [
  {
    id: "supplier-1",
    name: "Internal Supplier One",
    specialization: "cement",
    address: "Bishkek",
    website: "https://supplier.example",
  },
];

describe("procurement supplier match engine", () => {
  it("checks internal data, then marketplace tools, and returns evidence-backed preview cards", async () => {
    const calls: string[] = [];
    const result = await previewProcurementSupplierMatch({
      auth: buyerAuth,
      input: {
        requestIdHash: "request_hash",
        items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
        location: "Bishkek",
        limit: 10,
      },
      searchCatalogItems: async () => {
        calls.push("search_catalog");
        return catalogItems;
      },
      listSuppliers: async () => {
        calls.push("compare_suppliers");
        return suppliers;
      },
    });

    expect(calls).toEqual(["search_catalog", "compare_suppliers"]);
    expect(result.output).toMatchObject({
      status: "loaded",
      internalDataChecked: true,
      marketplaceChecked: true,
      externalChecked: false,
      supplierCards: [
        {
          supplierLabel: "Internal Supplier One",
          priceBucket: "unknown",
          deliveryBucket: "unknown",
          availabilityBucket: "unknown",
        },
      ],
      nextAction: "draft_request",
      requiresApproval: true,
    });
    expect(result.output.evidenceRefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining("internal_app:"),
        expect.stringContaining("catalog:"),
      ]),
    );
    expect(result.proof).toMatchObject({
      toolsCalled: ["search_catalog", "compare_suppliers"],
      mutationCount: 0,
      finalMutationAllowed: false,
      supplierSelectionAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      externalResultCanFinalize: false,
    });
  });

  it("returns an empty state without fake suppliers", async () => {
    const result = await previewProcurementSupplierMatch({
      auth: buyerAuth,
      input: {
        items: [{ materialLabel: "Rare item", quantity: 1, unit: "pc" }],
      },
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.output).toMatchObject({
      status: "empty",
      supplierCards: [],
      missingData: expect.arrayContaining(["supplier_candidates"]),
      nextAction: "explain",
      requiresApproval: true,
    });
  });
});
