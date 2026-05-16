import { hydrateProcurementReadyBuyOptionBundle } from "../../src/features/ai/procurement/aiProcurementRequestOptionHydrator";
import { validateProcurementReadyBuyOptionBundlePolicy } from "../../src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy";

describe("AI procurement request ready buy option hydrator", () => {
  it("hydrates director-approved requests as internal-first ready buy bundles", () => {
    const bundle = hydrateProcurementReadyBuyOptionBundle({
      requestId: "request-1248",
      requestStatus: "approved",
      items: [
        { materialLabel: "Cement M400" },
        { materialLabel: "Rebar A500" },
      ],
      internalSuppliers: [
        {
          supplierId: "supplier-a",
          supplierName: "ТОО Supplier Evidence A",
          matchedItems: ["Cement M400", "Rebar A500"],
          priceSignal: "есть цена из предыдущего предложения",
          deliverySignal: "срок из внутренней истории",
          reliabilitySignal: "есть внутренняя история",
          risks: ["нет свежей котировки"],
          evidence: ["internal:supplier:supplier-a", "internal:proposal:42"],
          missingData: ["fresh_quote"],
        },
      ],
    });

    expect(bundle).toMatchObject({
      requestId: "request-1248",
      requestStatus: "director_approved",
      generatedFrom: "internal_first",
      directOrderAllowed: false,
      directPaymentAllowed: false,
      directWarehouseMutationAllowed: false,
    });
    expect(bundle?.options).toHaveLength(1);
    expect(bundle?.options[0]).toMatchObject({
      supplierName: "ТОО Supplier Evidence A",
      source: "internal",
      coverageLabel: "2/2 позиций",
    });
    expect(validateProcurementReadyBuyOptionBundlePolicy(bundle)).toBe(true);
  });

  it("keeps external previews cited-only and only when internal coverage is insufficient", () => {
    const bundle = hydrateProcurementReadyBuyOptionBundle({
      requestId: "request-1249",
      requestStatus: "incoming",
      items: [
        { materialLabel: "Pump" },
        { materialLabel: "Cable" },
      ],
      internalSuppliers: [
        {
          supplierName: "Internal Pump Supplier",
          matchedItems: ["Pump"],
          evidence: ["internal:supplier:pump"],
        },
      ],
      externalCitedPreviews: [
        {
          supplierName: "Cited Market Supplier",
          matchedItems: ["Cable"],
          citationRefs: ["external:source:catalog-1"],
        },
        {
          supplierName: "Uncited Market Supplier",
          matchedItems: ["Cable"],
          citationRefs: [],
        },
      ],
    });

    expect(bundle?.options.map((option) => option.supplierName)).toEqual([
      "Internal Pump Supplier",
      "Cited Market Supplier",
    ]);
    expect(bundle?.options.find((option) => option.supplierName === "Uncited Market Supplier")).toBeUndefined();
    expect(validateProcurementReadyBuyOptionBundlePolicy(bundle)).toBe(true);
  });

  it("does not create fake suppliers when no supplier evidence exists", () => {
    const bundle = hydrateProcurementReadyBuyOptionBundle({
      requestId: "request-1250",
      requestStatus: "incoming",
      items: [{ materialLabel: "Rare item" }],
      internalSuppliers: [
        {
          supplierName: "",
          matchedItems: ["Rare item"],
          evidence: ["internal:supplier:blank"],
        },
      ],
    });

    expect(bundle?.options).toEqual([]);
    expect(bundle?.missingData).toEqual(expect.arrayContaining(["internal_supplier_evidence"]));
    expect(bundle?.recommendedNextAction).toBe("request_market_options");
    expect(validateProcurementReadyBuyOptionBundlePolicy(bundle)).toBe(true);
  });
});
