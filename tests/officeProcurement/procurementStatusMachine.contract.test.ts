import {
  buildProcurementLifecycleItemView,
  buildProcurementLifecycleRequestView,
  resolveProcurementLifecycleStage,
} from "../../src/features/office/procurementLifecycle";

describe("procurement lifecycle status machine", () => {
  it("maps buyer, tender, purchase, warehouse, and receipt states into one canonical lifecycle", () => {
    expect(resolveProcurementLifecycleStage({ requestItemId: "item-1" })).toBe("to_purchase");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        supplier: "ОсОО Поставщик",
        price: "120",
      }),
    ).toBe("supplier_selection");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        tenderState: "Торги / запрос цены",
      }),
    ).toBe("tender");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        proposalStatus: "Утверждено",
      }),
    ).toBe("ordered");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        purchaseItemId: "purchase-item-1",
        qtyExpected: 10,
        qtyReceived: 0,
        qtyLeft: 10,
      }),
    ).toBe("ready_for_warehouse");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        qtyExpected: 10,
        qtyReceived: 4,
        qtyLeft: 6,
      }),
    ).toBe("partially_received");
    expect(
      resolveProcurementLifecycleStage({
        requestItemId: "item-1",
        qtyExpected: 10,
        qtyReceived: 10,
        qtyLeft: 0,
      }),
    ).toBe("received");
  });

  it("builds request progress from the same mapper used by all roles", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-1",
      expectedItemCount: 2,
      accountantInvoiceAmount: 220,
      items: [
        {
          requestId: "request-1",
          requestItemId: "item-1",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-1",
          supplier: "ОсОО Поставщик",
          price: 10,
          qty: 10,
          purchaseItemId: "purchase-item-1",
          qtyExpected: 10,
          qtyReceived: 4,
          qtyLeft: 6,
          invoiceAmount: 220,
          paymentStatus: "К оплате",
        },
        {
          requestId: "request-1",
          requestItemId: "item-2",
          proposalId: "proposal-1",
          proposalItemId: "proposal-item-2",
          supplier: "ОсОО Поставщик",
          price: 12,
          qty: 10,
          tenderState: "Торги / запрос цены",
        },
      ],
    });

    expect(request.buyerCanFillPrice).toBe(true);
    expect(request.buyerCanFillSupplier).toBe(true);
    expect(request.buyerCanMarkForTender).toBe(true);
    expect(request.procurementRecordCreated).toBe(true);
    expect(request.warehousePartialReceiptSupported).toBe(true);
    expect(request.accountantAmountsMatchBuyerPrices).toBe(true);
    expect(request.foremanSeesProcurementProgress).toBe(true);
    expect(request.directorSeesProcurementProgress).toBe(true);
    expect(request.status).toBe("partially_received");
    expect(request.statusLabel).toBe("Принято частично");
  });

  it("does not render question mark placeholders or fake zero amounts for unknown price", () => {
    const item = buildProcurementLifecycleItemView({
      requestItemId: "item-unknown",
      qty: 10,
    });

    expect(item.amount).toBeNull();
    expect(item.amountText).toBe("появится после цены");
    expect(item.hasQuestionMarkPlaceholder).toBe(false);
    expect(item.hasFakeZeroAmount).toBe(false);
  });
});
