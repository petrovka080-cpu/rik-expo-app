import { buildProcurementLifecycleRequestView } from "../../src/features/office/procurementLifecycle";

describe("accountant procurement amounts", () => {
  it("matches accountant invoice amount to buyer prices and exposes payment status without debug labels", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-accounting",
      accountantInvoiceAmount: 1_700,
      items: [
        {
          requestItemId: "item-1",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          supplier: "ОсОО Поставщик",
          qty: 1,
          price: 1700,
          invoiceAmount: 1700,
          outstandingAmount: 1700,
          paymentStatus: "К оплате",
          hasInvoice: true,
        },
      ],
    });

    expect(request.accountantProcurementAmountsVisible).toBe(true);
    expect(request.accountantAmountsMatchBuyerPrices).toBe(true);
    expect(request.financialStatus).toBe("payment_planned");
    expect(request.financialStatusLabel).toBe("Оплата запланирована");
    expect(JSON.stringify(request)).not.toMatch(/canonical_v3|source-of-truth|allocation-level|invoice-level|undefined|null visible/i);
  });

  it("fails amount parity honestly when accounting does not match buyer prices", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-accounting-mismatch",
      accountantInvoiceAmount: 100,
      items: [
        {
          requestItemId: "item-1",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          qty: 2,
          price: 100,
          invoiceAmount: 100,
        },
      ],
    });

    expect(request.totalAmount).toBe(200);
    expect(request.accountantAmountsMatchBuyerPrices).toBe(false);
  });
});
