import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";
import type { ProcurementReadyBuyOptionBundle } from "../../src/features/ai/procurement/aiProcurementReadyBuyOptionTypes";

const readyBuyBundle: ProcurementReadyBuyOptionBundle = {
  requestId: "req-1248",
  requestStatus: "director_approved",
  generatedFrom: "internal_first",
  options: [{
    id: "supplier-a",
    supplierName: "Evidence Supplier",
    source: "internal",
    matchedItems: ["cable", "cement"],
    coverageLabel: "8/12 items",
    priceSignal: "price exists for 6 items",
    risks: ["missing price for 2 items"],
    missingData: ["price for 2 items"],
    evidence: ["supplier:1", "request:req-1248"],
    recommendedAction: "request_quote",
  }],
  risks: ["missing price for 2 items"],
  missingData: ["price for 2 items"],
  recommendedNextAction: "draft_supplier_request",
  directOrderAllowed: false,
  directPaymentAllowed: false,
  directWarehouseMutationAllowed: false,
};

describe("buyer screen-native value packs", () => {
  it("shows approved request as prepared procurement work item", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "buyer",
      context: "buyer",
      screenId: "buyer.request.detail",
      readyBuyBundle,
    });

    expect(pack.readyOptions[0]?.title).toContain("Evidence Supplier");
    expect(pack.risks[0]?.reason).toContain("missing price");
    expect(pack.missingData[0]?.label).toContain("price");
    expect(pack.directMutationAllowed).toBe(false);
    expect(pack.readyOptions[0]?.canExecuteDirectly).toBe(false);
  });
});
