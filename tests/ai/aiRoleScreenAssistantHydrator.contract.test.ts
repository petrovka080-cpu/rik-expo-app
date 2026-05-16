import { hydrateAiRoleScreenAssistantContext } from "../../src/features/ai/realAssistants/aiRoleScreenAssistantHydrator";

describe("AI role-screen assistant hydrator", () => {
  it("hydrates accountant payment evidence from explicit screen params without writes", () => {
    const hydrated = hydrateAiRoleScreenAssistantContext({
      role: "accountant",
      context: "accountant",
      searchParams: {
        screenId: "accountant.main",
        paymentSupplierName: "Evidence Supplier",
        paymentAmountLabel: "1 200 000 ₸",
        paymentRisk: "сумма выше обычной истории",
        paymentMissingDocument: "подтверждение доставки",
        paymentEvidence: "payment:1248|document:delivery",
      },
    });

    expect(hydrated.screenId).toBe("accountant.main");
    expect(hydrated.finance.payments).toHaveLength(1);
    expect(hydrated.finance.payments[0]?.supplierName).toBe("Evidence Supplier");
    expect(hydrated.finance.payments[0]?.evidence).toEqual(["payment:1248", "document:delivery"]);
  });
});
