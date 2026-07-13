import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("stock ledger receipt actuals", () => {
  it("creates scoped receipt ledger entries and recalculates stock from real quantities", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-stock-receipt",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-stock-receipt",
          requestItemId: "item-cable",
          companyId: "company-1",
          materialId: "material-cable",
          code: "MAT-CABLE",
          name: "Кабель ВВГнг",
          uom: "linear_m",
          plannedQty: 10,
          qtyExpected: 10,
          qtyReceived: 6,
          qtyIssued: 2,
          qtyOnHand: 4,
          proposalItemId: "proposal-item-cable",
          purchaseItemId: "purchase-item-cable",
          incomingItemId: "incoming-item-cable",
          warehouseUserId: "warehouse-user-1",
          warehouseUserName: "Склад Бишкек",
          objectName: "Административное здание",
          price: 35,
          plannedAmount: 350,
          invoiceAmount: 350,
          totalPaid: 100,
          paymentStatus: "Частично оплачено",
        },
      ],
    });

    const receipt = view.ledgerEntries.find((entry) => entry.kind === "receipt");

    expect(view.warehouseStockLedgerCreated).toBe(true);
    expect(view.warehouseReceiptUpdatesStock).toBe(true);
    expect(receipt).toMatchObject({
      requestId: "request-stock-receipt",
      requestItemId: "item-cable",
      procurementItemId: "purchase-item-cable",
      companyId: "company-1",
      warehouseUserId: "warehouse-user-1",
      qty: 6,
      signedQty: 6,
      createdFrom: "warehouse_receive",
      hasRequiredScope: true,
    });
    expect(view.items[0]?.stock.currentStockQty).toBe(4);
    expect(view.items[0]?.stock.formulaStockQty).toBe(4);
    expect(view.noCrossCompanyLeak).toBe(true);
    expect(view.noFakeGreen).toBe(true);
  });
});
