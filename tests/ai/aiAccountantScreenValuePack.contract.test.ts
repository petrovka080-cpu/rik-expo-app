import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("accountant screen-native value packs", () => {
  it("prepares accountant.main and accountant.payment work without direct payment execution", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.payment",
      searchParams: {
        paymentSupplierName: "Evidence Supplier",
        paymentAmountLabel: "1 200 000 KZT",
        paymentRisk: "amount above supplier history",
        paymentMissingDocument: "delivery confirmation",
        paymentEvidence: "payment:1248|document:delivery",
      },
    });

    expect(pack.title).toContain("платеж");
    expect(pack.readyOptions[0]?.title).toContain("Evidence Supplier");
    expect(pack.missingData[0]?.label).toContain("delivery confirmation");
    expect(pack.directMutationAllowed).toBe(false);
    expect(pack.nextActions.every((action) => action.canExecuteDirectly === false)).toBe(true);
  });
});
