import { buildAccountantMainAiPanelModel } from "../../src/features/ai/finance/aiAccountantTodayPaymentAssistant";

describe("accountant.main professional AI panel", () => {
  it("turns the accountant inbox into finance work instead of generic chat", () => {
    const model = buildAccountantMainAiPanelModel({
      rows: [
        {
          proposal_id: "proposal-1",
          supplier: "Evidence Supplier",
          invoice_number: "INV-7",
          invoice_amount: 1_200_000,
          outstanding_amount: 1_200_000,
          invoice_currency: "KGS",
          has_invoice: false,
          payment_eligible: false,
          failure_code: "missing_delivery_confirmation",
          payments_count: 0,
          sent_to_accountant_at: "2026-05-16T08:00:00Z",
        },
        {
          proposal_id: "proposal-2",
          supplier: "Partial Supplier",
          invoice_number: "INV-8",
          invoice_amount: 500_000,
          outstanding_amount: 180_000,
          invoice_currency: "KGS",
          total_paid: 320_000,
          has_invoice: true,
          payment_eligible: true,
          payments_count: 1,
          sent_to_accountant_at: "2026-05-16T09:00:00Z",
        },
      ],
    });

    expect(model.status).toBe("ready");
    expect(model.title).toBe("Готово от AI · Финансы сегодня");
    expect(model.metrics).toEqual(expect.arrayContaining([
      { id: "incoming", label: "Поступило на оплату", value: "2" },
      { id: "critical", label: "Критические", value: "2" },
      { id: "missing_docs", label: "Без документов", value: "1" },
    ]));
    expect(model.criticalPayments[0]).toMatchObject({
      supplierName: "Evidence Supplier",
      riskReason: expect.stringContaining("missing_delivery_confirmation"),
      missingData: expect.arrayContaining(["счёт/документ"]),
    });
    expect(model.missingData).toContain("история поставщика для проверки необычной суммы");
    expect(model.actions.find((action) => action.id === "accountant.main.submit_approval")).toMatchObject({
      requiresApproval: true,
      executesDirectly: false,
    });
    expect(model.providerCalled).toBe(false);
    expect(model.dbWriteUsed).toBe(false);
    expect(model.directMutationAllowed).toBe(false);
    expect(model.fakeDataUsed).toBe(false);
  });

  it("shows an exact missing-data state without inventing payments", () => {
    const model = buildAccountantMainAiPanelModel({ rows: [] });

    expect(model.status).toBe("missing_data");
    expect(model.summary).toContain("Данных не хватает");
    expect(model.metrics.find((metric) => metric.id === "amount")?.value).toBe("данных нет");
    expect(model.criticalPayments).toEqual([]);
    expect(model.missingData).toEqual(expect.arrayContaining([
      "read-only маршрут оплат бухгалтера",
      "строки оплат за сегодня",
    ]));
    expect(model.fakeDataUsed).toBe(false);
  });
});
