import { hydrateApprovedRequestSupplierProposalBundle } from "../../src/features/ai/procurement/aiApprovedRequestSupplierProposalHydrator";
import { NO_INTERNAL_SUPPLIERS_MESSAGE } from "../../src/features/ai/procurement/aiApprovedRequestSupplierOptions";
import { validateSupplierProposalBundlePolicy } from "../../src/features/ai/procurement/aiSupplierProposalReadinessPolicy";

describe("approved request supplier proposal hydrator", () => {
  it("hydrates ready supplier options only from real internal evidence", () => {
    const bundle = hydrateApprovedRequestSupplierProposalBundle({
      requestId: "request-1",
      approvalStatus: "approved",
      items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
      internalSuppliers: [
        {
          supplierId: "supplier-1",
          supplierName: "Internal Supplier One",
          matchedItems: ["Cement M400"],
          priceSignal: "price from internal quote",
          deliverySignal: "delivery from internal quote",
          reliabilitySignal: "previously used",
          risks: ["confirm_current_price"],
          evidence: ["internal:supplier:supplier-1", "internal:quote:quote-1"],
          missingData: ["fresh_quote"],
        },
      ],
    });

    expect(bundle).toMatchObject({
      requestId: "request-1",
      approvalStatus: "approved",
      generatedFrom: "internal_first",
      directOrderAllowed: false,
      requiresApprovalForOrder: true,
    });
    expect(bundle?.supplierOptions).toHaveLength(1);
    expect(bundle?.supplierOptions[0]).toMatchObject({
      supplierName: "Internal Supplier One",
      source: "internal",
      recommendedNextAction: "compare",
    });
    expect(validateSupplierProposalBundlePolicy(bundle)).toBe(true);
  });

  it("does not fake suppliers when no supplier evidence exists", () => {
    const bundle = hydrateApprovedRequestSupplierProposalBundle({
      requestId: "request-2",
      approvalStatus: "approved",
      items: [{ materialLabel: "Rare item" }],
      internalSuppliers: [],
    });

    expect(bundle?.supplierOptions).toEqual([]);
    expect(NO_INTERNAL_SUPPLIERS_MESSAGE).toContain("Готовых внутренних поставщиков не найдено");
    expect(validateSupplierProposalBundlePolicy(bundle)).toBe(true);
  });

  it("does not hydrate non-approved requests", () => {
    expect(
      hydrateApprovedRequestSupplierProposalBundle({
        requestId: "request-3",
        approvalStatus: "pending",
        items: [{ materialLabel: "Cement M400" }],
        internalSuppliers: [
          {
            supplierName: "Internal Supplier One",
            matchedItems: ["Cement M400"],
            evidence: ["internal:supplier:supplier-1"],
          },
        ],
      }),
    ).toBeNull();
  });
});
