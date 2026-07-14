import { buildStockFinanceActualsView } from "../../src/features/office/stockFinanceActuals";

describe("accounting actuals", () => {
  it("ties invoice and paid amount to procurement record, request, and company scope", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-finance",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-finance",
          requestItemId: "item-finance",
          companyId: "company-1",
          materialId: "material-finance",
          name: "Кабель",
          uom: "linear_m",
          plannedQty: 10,
          qtyExpected: 10,
          qtyReceived: 10,
          qtyIssued: 4,
          qtyOnHand: 6,
          proposalId: "proposal-finance",
          proposalItemId: "proposal-item-finance",
          purchaseItemId: "purchase-item-finance",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          price: 35,
          plannedAmount: 350,
          invoiceAmount: 350,
          totalPaid: 100,
          outstandingAmount: 250,
          paymentStatus: "Частично оплачено",
          hasInvoice: true,
          invoiceNumber: "INV-100",
        },
      ],
    });

    expect(view.accountantInvoicePaymentTiedToProcurement).toBe(true);
    expect(view.accountantAmountsMatchBuyerProcurement).toBe(true);
    expect(view.financialActualsWritten).toBe(true);
    expect(view.items[0]?.finance.actualAmount).toBe(350);
    expect(view.items[0]?.finance.procurementRecordId).toBe("proposal-item-finance");
    expect(view.noFakeZeroAmount).toBe(true);
    expect(view.noQuestionMarkPlaceholders).toBe(true);
  });

  it("does not fake parity when accountant amount differs from buyer procurement amount", () => {
    const view = buildStockFinanceActualsView({
      requestId: "request-finance-mismatch",
      expectedCompanyId: "company-1",
      items: [
        {
          requestId: "request-finance-mismatch",
          requestItemId: "item-finance",
          companyId: "company-1",
          materialId: "material-finance",
          name: "Кабель",
          uom: "linear_m",
          plannedQty: 10,
          qtyExpected: 10,
          qtyReceived: 10,
          qtyIssued: 4,
          qtyOnHand: 6,
          proposalItemId: "proposal-item-finance",
          purchaseItemId: "purchase-item-finance",
          warehouseUserId: "warehouse-user-1",
          objectName: "Объект",
          price: 35,
          plannedAmount: 350,
          invoiceAmount: 300,
          totalPaid: 100,
        },
      ],
    });

    expect(view.accountantAmountsMatchBuyerProcurement).toBe(false);
  });
});
