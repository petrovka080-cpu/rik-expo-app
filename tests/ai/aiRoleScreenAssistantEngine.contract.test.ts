import { getAiRoleScreenAssistantPack } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantEngine";
import { validateAiRoleScreenAssistantPack } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantPolicy";

describe("AI role-screen assistant engine", () => {
  it("builds a useful accountant pack with critical payments and ready actions", () => {
    const pack = getAiRoleScreenAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
      searchParams: {
        paymentSupplierName: "Evidence Supplier",
        paymentAmountLabel: "1 200 000 ₸",
        paymentTotalAmountLabel: "4 850 000 ₸",
        paymentRisk: "сумма выше обычной истории",
        paymentMissingDocument: "подтверждение доставки",
        paymentEvidence: "payment:1248",
        paymentApprovalCount: "3",
      },
    });

    expect(pack.title).toBe("Финансы сегодня");
    expect(pack.summary).toContain("4 850 000 ₸");
    expect(pack.readyItems[0]?.title).toContain("Evidence Supplier");
    expect(pack.risks).toHaveLength(1);
    expect(pack.nextActions.some((action) => action.kind === "submit_for_approval")).toBe(true);
    expect(validateAiRoleScreenAssistantPack(pack).ok).toBe(true);
  });

  it("does not invent finance rows when no evidence is hydrated", () => {
    const pack = getAiRoleScreenAssistantPack({
      role: "accountant",
      context: "accountant",
      screenId: "accountant.main",
    });

    expect(pack.readyItems).toHaveLength(0);
    expect(pack.summary).toContain("без выдуманных платежей");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
