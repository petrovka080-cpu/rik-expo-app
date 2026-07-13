import { buildProcurementLifecycleRequestView } from "../../src/features/office/procurementLifecycle";

describe("procurement lifecycle backpropagation", () => {
  it("returns one progress view that foreman and director can read after buyer, warehouse, and accounting updates", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-chain",
      expectedItemCount: 2,
      accountantInvoiceAmount: 350,
      items: [
        {
          requestItemId: "item-1",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          supplier: "ОсОО Поставщик",
          qty: 10,
          price: 20,
          purchaseItemId: "purchase-item-1",
          qtyExpected: 10,
          qtyReceived: 10,
          qtyLeft: 0,
          invoiceAmount: 350,
          totalPaid: 350,
          outstandingAmount: 0,
          paymentStatus: "Оплачено",
        },
        {
          requestItemId: "item-2",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-2",
          supplier: "ОсОО Поставщик",
          qty: 5,
          price: 30,
          purchaseItemId: "purchase-item-2",
          qtyExpected: 5,
          qtyReceived: 2,
          qtyLeft: 3,
        },
      ],
    });

    expect(request.status).toBe("received");
    expect(request.statusLabel).toBe("Принято на склад");
    expect(request.foremanSeesProcurementProgress).toBe(true);
    expect(request.directorSeesProcurementProgress).toBe(true);
    expect(request.accountantAmountsMatchBuyerPrices).toBe(true);
    expect(request.noDuplicateProcurementRows).toBe(true);
    expect(request.noFakeZeroSum).toBe(true);
  });
});
