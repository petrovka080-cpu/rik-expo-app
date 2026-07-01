import { buildProcurementLifecycleRequestView } from "../../src/features/office/procurementLifecycle";

describe("warehouse procurement receipt flow", () => {
  it("supports visible procurement items, partial receipt, full receipt, and persisted received qty", () => {
    const request = buildProcurementLifecycleRequestView({
      requestId: "request-warehouse",
      expectedItemCount: 2,
      items: [
        {
          requestItemId: "item-partial",
          proposalItemId: "proposal-item-partial",
          purchaseItemId: "purchase-item-partial",
          qtyExpected: 10,
          qtyReceived: 4,
          qtyLeft: 6,
        },
        {
          requestItemId: "item-full",
          proposalItemId: "proposal-item-full",
          purchaseItemId: "purchase-item-full",
          qtyExpected: 5,
          qtyReceived: 5,
          qtyLeft: 0,
        },
      ],
    });

    expect(request.warehouseProcurementItemsVisible).toBe(true);
    expect(request.warehousePartialReceiptSupported).toBe(true);
    expect(request.warehouseReceivedQtyPersisted).toBe(true);
    expect(request.items[0]?.stage).toBe("partially_received");
    expect(request.items[1]?.stage).toBe("received");
    expect(request.totalReceived).toBe(9);
    expect(request.totalExpected).toBe(15);
  });
});
