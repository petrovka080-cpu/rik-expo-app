import { buildAccountantTodayPaymentAssistant } from "../../src/features/ai/finance/aiAccountantTodayPaymentAssistant";

describe("accountant today payment assistant", () => {
  it("summarizes payment count, amount, critical risk, missing docs, and approval action", () => {
    const pack = buildAccountantTodayPaymentAssistant({
      payments: [{
        id: "pay-1",
        supplierName: "Evidence Supplier",
        amountLabel: "1 200 000 ₸",
        requestId: "#1248",
        riskReason: "сумма выше обычной истории",
        missingDocument: "подтверждение доставки",
        approvalStatus: "ready_for_approval",
        evidence: ["payment:pay-1"],
      }],
      totalAmountLabel: "4 850 000 ₸",
    });

    expect(pack.summary).toContain("4 850 000 ₸");
    expect(pack.readyItems[0]?.actionKind).toBe("approval_required");
    expect(pack.missingData[0]?.label).toContain("подтверждение доставки");
    expect(pack.nextActions.every((action) => action.canExecuteDirectly === false)).toBe(true);
  });
});
